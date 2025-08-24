import Editor from "@monaco-editor/react";

export default function PlaybookEditor() {
	return (
		<Editor
			defaultLanguage="yaml"
			height="70dvh"
			options={{ automaticLayout: true, minimap: { enabled: false } }}
			theme="github-light"
		/>
	);
}
