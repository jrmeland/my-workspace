/**
 * UserQuestionAnswer — Interactive choice picker tool for the agent.
 *
 * Modes:
 *   single  — pick exactly one option (default)
 *   multi   — toggle multiple options with Space, confirm with Enter
 *
 * Every prompt automatically includes a final
 *   "Tell the agent what to do instead" option that opens a free-text editor.
 *
 * On any option you can press Tab to annotate it — an inline editor appears
 * so you can add extra context to the option before confirming.
 */

import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import {
	Editor,
	type EditorTheme,
	Key,
	matchesKey,
	Text,
	truncateToWidth,
} from "@mariozechner/pi-tui";
import { Type } from "@sinclair/typebox";
import { StringEnum } from "@mariozechner/pi-ai";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface OptionParam {
	label: string;
	description?: string;
}

interface DisplayOption extends OptionParam {
	isRedirect?: boolean;
	isNone?: boolean;
	checked?: boolean;
	annotation?: string;
}

interface AnswerDetail {
	label: string;
	annotation?: string;
	wasCustom?: boolean;
	index?: number;
}

interface ToolDetails {
	question: string;
	mode: "single" | "multi";
	options: string[];
	answers: AnswerDetail[];
	cancelled: boolean;
}

/* ------------------------------------------------------------------ */
/*  Schema                                                             */
/* ------------------------------------------------------------------ */

const OptionSchema = Type.Object({
	label: Type.String({ description: "Display label for the option" }),
	description: Type.Optional(
		Type.String({ description: "Optional description shown below the label" }),
	),
});

const Params = Type.Object({
	question: Type.String({ description: "The question to present to the user" }),
	options: Type.Array(OptionSchema, {
		description: "Options for the user to choose from",
	}),
	mode: Type.Optional(
		StringEnum(["single", "multi"] as const, {
			description:
				"Selection mode. 'single' (default) = pick one, 'multi' = toggle several with Space then Enter to confirm.",
		}),
	),
});

/* ------------------------------------------------------------------ */
/*  Extension                                                          */
/* ------------------------------------------------------------------ */

export default function userQuestionAnswer(pi: ExtensionAPI) {
	pi.registerTool({
		name: "ask_user",
		label: "Ask User",
		description:
			"Present the user with a choice picker and return their selection. " +
			"Supports single-select and multi-select modes. The user can also annotate any option with additional text, " +
			"or choose to tell the agent what to do instead of selecting a presented option.",
		promptSnippet:
			"Present an interactive choice picker to the user (single or multi-select)",
		promptGuidelines: [
			"Use ask_user when you need the user to choose between discrete options or confirm a course of action.",
			"Prefer single mode for simple yes/no or A-vs-B choices; use multi mode when several options can apply.",
			"Keep option labels short and descriptive. Put extra context in the description field.",
		],
		parameters: Params,

		async execute(_toolCallId, params, _signal, _onUpdate, ctx) {
			if (!ctx.hasUI) {
				return {
					content: [
						{
							type: "text" as const,
							text: "Error: UI not available (running in non-interactive mode)",
						},
					],
					details: {
						question: params.question,
						mode: params.mode ?? "single",
						options: params.options.map((o) => o.label),
						answers: [],
						cancelled: true,
					} as ToolDetails,
				};
			}

			if (params.options.length === 0) {
				return {
					content: [{ type: "text" as const, text: "Error: No options provided" }],
					details: {
						question: params.question,
						mode: params.mode ?? "single",
						options: [],
						answers: [],
						cancelled: true,
					} as ToolDetails,
				};
			}

			const mode: "single" | "multi" = params.mode ?? "single";

			/* Build display options — always append the redirect option */
			const allOptions: DisplayOption[] = params.options.map((o) => ({
				...o,
				checked: false,
				annotation: undefined,
			}));
			allOptions.push({
				label: "None of these",
				isNone: true,
				checked: false,
			});
			allOptions.push({
				label: "Tell the agent what to do instead",
				isRedirect: true,
				checked: false,
			});

			/* ---- Interactive UI ---- */

			const result = await ctx.ui.custom<ToolDetails>((tui, theme, _kb, done) => {
				// ---- state ----
				let cursor = 0;
				let editingIndex: number | null = null; // which option is being annotated
				let redirectMode = false; // free-text "tell agent" mode
				let cachedLines: string[] | undefined;

				const editorTheme: EditorTheme = {
					borderColor: (s: string) => theme.fg("accent", s),
					selectList: {
						selectedPrefix: (t: string) => theme.fg("accent", t),
						selectedText: (t: string) => theme.fg("accent", t),
						description: (t: string) => theme.fg("muted", t),
						scrollInfo: (t: string) => theme.fg("dim", t),
						noMatch: (t: string) => theme.fg("warning", t),
					},
				};
				const editor = new Editor(tui, editorTheme);

				// ---- helpers ----
				function refresh() {
					cachedLines = undefined;
					tui.requestRender();
				}

				function finishCancel() {
					done({
						question: params.question,
						mode,
						options: params.options.map((o) => o.label),
						answers: [],
						cancelled: true,
					});
				}

				function finishWith(answers: AnswerDetail[]) {
					done({
						question: params.question,
						mode,
						options: params.options.map((o) => o.label),
						answers,
						cancelled: false,
					});
				}

				// ---- editor callbacks ----

				editor.onSubmit = (value: string) => {
					const trimmed = value.trim();

					if (redirectMode) {
						// "Tell the agent" free-text
						if (trimmed) {
							finishWith([
								{
									label: trimmed,
									wasCustom: true,
								},
							]);
						} else {
							// empty → go back to option list
							redirectMode = false;
							editor.setText("");
							refresh();
						}
						return;
					}

					if (editingIndex !== null) {
						// Annotation on an option
						const opt = allOptions[editingIndex];
						opt.annotation = trimmed || undefined;
						editingIndex = null;
						editor.setText("");
						refresh();
						return;
					}
				};

				// ---- input handling ----

				function handleInput(data: string) {
					// Editor active?
					if (redirectMode || editingIndex !== null) {
						if (matchesKey(data, Key.escape)) {
							if (redirectMode) {
								redirectMode = false;
							} else {
								editingIndex = null;
							}
							editor.setText("");
							refresh();
							return;
						}
						editor.handleInput(data);
						refresh();
						return;
					}

					// ↑ / ↓ navigation
					if (matchesKey(data, Key.up)) {
						cursor = Math.max(0, cursor - 1);
						refresh();
						return;
					}
					if (matchesKey(data, Key.down)) {
						cursor = Math.min(allOptions.length - 1, cursor + 1);
						refresh();
						return;
					}

					// Tab — annotate the currently highlighted option
					if (matchesKey(data, Key.tab)) {
						const opt = allOptions[cursor];
						if (opt.isNone) {
							// No annotation on "None of these" — treat as Enter
							finishWith([{ label: "None of these", wasCustom: false }]);
							return;
						}
						if (opt.isRedirect) {
							// treat Tab on redirect the same as Enter
							redirectMode = true;
							editor.setText("");
							refresh();
							return;
						}
						editingIndex = cursor;
						editor.setText(opt.annotation ?? "");
						refresh();
						return;
					}

					// Space — toggle in multi mode
					if (matchesKey(data, Key.space) && mode === "multi") {
						const opt = allOptions[cursor];
						if (!opt.isRedirect && !opt.isNone) {
							opt.checked = !opt.checked;
							refresh();
						}
						return;
					}

					// Enter — confirm
					if (matchesKey(data, Key.enter)) {
						const opt = allOptions[cursor];

						// "None of these" option
						if (opt.isNone) {
							finishWith([{ label: "None of these", wasCustom: false }]);
							return;
						}

						// "Tell the agent" option
						if (opt.isRedirect) {
							redirectMode = true;
							editor.setText("");
							refresh();
							return;
						}

						if (mode === "single") {
							finishWith([
								{
									label: opt.label,
									annotation: opt.annotation,
									index: cursor + 1,
								},
							]);
							return;
						}

						// multi — confirm selection
						const selected = allOptions
							.filter((o) => o.checked && !o.isRedirect)
							.map((o, _i) => ({
								label: o.label,
								annotation: o.annotation,
								index: allOptions.indexOf(o) + 1,
							}));

						if (selected.length === 0) {
							// Nothing toggled yet — treat Enter as toggle + immediate confirm
							opt.checked = true;
							finishWith([
								{
									label: opt.label,
									annotation: opt.annotation,
									index: cursor + 1,
								},
							]);
							return;
						}
						finishWith(selected);
						return;
					}

					// Escape — cancel
					if (matchesKey(data, Key.escape)) {
						finishCancel();
					}
				}

				// ---- render ----

				function render(width: number): string[] {
					if (cachedLines) return cachedLines;

					const lines: string[] = [];
					const add = (s: string) => lines.push(truncateToWidth(s, width));

					// Top border
					add(theme.fg("accent", "─".repeat(width)));

					// Question
					add(theme.fg("text", ` ${params.question}`));
					lines.push("");

					// Mode badge
					if (mode === "multi") {
						add(
							theme.fg("dim", " [multi-select] Space to toggle • Enter to confirm"),
						);
						lines.push("");
					}

					// Options
					for (let i = 0; i < allOptions.length; i++) {
						const opt = allOptions[i];
						const isCurrent = i === cursor;
						const isEditing = editingIndex === i;

						// Build prefix
						let prefix: string;
						if (mode === "multi" && !opt.isRedirect && !opt.isNone) {
							const box = opt.checked
								? theme.fg("success", "☑")
								: theme.fg("muted", "☐");
							prefix = isCurrent
								? theme.fg("accent", "> ") + box + " "
								: "  " + box + " ";
						} else {
							prefix = isCurrent ? theme.fg("accent", "> ") : "  ";
						}

						// Label
						const num = `${i + 1}. `;
						let labelText: string;
						if (opt.isRedirect || opt.isNone) {
							labelText = isCurrent
								? theme.fg("accent", theme.italic(opt.label))
								: theme.fg("muted", theme.italic(opt.label));
						} else if (isCurrent) {
							labelText = theme.fg("accent", `${num}${opt.label}`);
						} else {
							labelText = theme.fg("text", `${num}${opt.label}`);
						}

						// Annotation badge
						const badge =
							opt.annotation
								? " " + theme.fg("warning", `[+${opt.annotation}]`)
								: "";

						add(`${prefix}${labelText}${badge}`);

						// Description
						if (opt.description) {
							const indent = mode === "multi" && !opt.isRedirect && !opt.isNone ? "       " : "     ";
							add(`${indent}${theme.fg("muted", opt.description)}`);
						}

						// Inline editor for annotation
						if (isEditing) {
							lines.push("");
							add(
								theme.fg("muted", "   Add context to this option:"),
							);
							for (const line of editor.render(width - 4)) {
								add(`   ${line}`);
							}
						}
					}

					// Redirect editor
					if (redirectMode) {
						lines.push("");
						add(theme.fg("muted", " Tell the agent what to do:"));
						for (const line of editor.render(width - 2)) {
							add(` ${line}`);
						}
					}

					// Help
					lines.push("");
					if (redirectMode || editingIndex !== null) {
						add(theme.fg("dim", " Enter to submit • Esc to go back"));
					} else {
						const parts = ["↑↓ navigate"];
						if (mode === "multi") parts.push("Space toggle");
						parts.push("Enter select");
						parts.push("Tab annotate");
						parts.push("Esc cancel");
						add(theme.fg("dim", ` ${parts.join(" • ")}`));
					}

					// Bottom border
					add(theme.fg("accent", "─".repeat(width)));

					cachedLines = lines;
					return lines;
				}

				return {
					render,
					invalidate: () => {
						cachedLines = undefined;
					},
					handleInput,
				};
			});

			/* ---- Build LLM-facing result ---- */

			const details: ToolDetails = result;

			if (result.cancelled) {
				return {
					content: [{ type: "text" as const, text: "User cancelled the selection." }],
					details,
				};
			}

			// Format human-readable answer text for the LLM
			const answerLines = result.answers.map((a) => {
				if (a.wasCustom) {
					return `User said: ${a.label}`;
				}
				let line = `User selected: ${a.index}. ${a.label}`;
				if (a.annotation) {
					line += ` (user added: "${a.annotation}")`;
				}
				return line;
			});

			return {
				content: [{ type: "text" as const, text: answerLines.join("\n") }],
				details,
			};
		},

		/* ---- Custom call rendering ---- */

		renderCall(args: any, theme: any, _context: any) {
			const opts = Array.isArray(args.options) ? args.options : [];
			const modeLabel = args.mode === "multi" ? " [multi]" : "";
			let text =
				theme.fg("toolTitle", theme.bold("ask_user")) +
				theme.fg("dim", modeLabel) +
				" " +
				theme.fg("muted", args.question);

			if (opts.length) {
				const labels = opts.map((o: OptionParam) => o.label);
				const numbered = [...labels, "None of these", "Tell the agent what to do instead"].map(
					(o: string, i: number) => `${i + 1}. ${o}`,
				);
				text += `\n${theme.fg("dim", `  ${numbered.join(", ")}`)}`;
			}
			return new Text(text, 0, 0);
		},

		/* ---- Custom result rendering ---- */

		renderResult(result: any, _options: any, theme: any, _context: any) {
			const details = result.details as ToolDetails | undefined;
			if (!details) {
				const text = result.content[0];
				return new Text(text?.type === "text" ? text.text : "", 0, 0);
			}

			if (details.cancelled) {
				return new Text(theme.fg("warning", "Cancelled"), 0, 0);
			}

			const lines = details.answers.map((a: AnswerDetail) => {
				if (a.wasCustom) {
					return (
						theme.fg("success", "✓ ") +
						theme.fg("muted", "(wrote) ") +
						theme.fg("accent", a.label)
					);
				}
				if (a.label === "None of these") {
					return theme.fg("warning", "✗ ") + theme.fg("muted", "None of these");
				}
				let display = a.index ? `${a.index}. ${a.label}` : a.label;
				if (a.annotation) {
					display += theme.fg("warning", ` [+${a.annotation}]`);
				}
				return theme.fg("success", "✓ ") + theme.fg("accent", display);
			});

			return new Text(lines.join("\n"), 0, 0);
		},
	});
}
