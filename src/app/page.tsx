import { EditorShell } from "../components/editor/editor-shell";
import { listingProfileFixture } from "../components/editor/editor-model";

export default function EditorPage() {
  return <EditorShell initialProfile={listingProfileFixture} />;
}
