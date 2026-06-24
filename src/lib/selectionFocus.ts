import { END_NODE_ID, GRAPH_SELECTION_KIND, type EditorTree, type GraphSelection } from '../model.js';

export type GraphSelectionFocus = {
    focusNodeId: string | null;
    focusChoiceId: string | null;
};

/** Pure focus mapping for graph selection (no React state). */
export function resolveGraphSelectionFocus(
    selection: GraphSelection,
    tree?: EditorTree | null,
): GraphSelectionFocus {
    if (selection.kind === null) {
        return { focusNodeId: null, focusChoiceId: null };
    }

    if (selection.kind === GRAPH_SELECTION_KIND.NODE) {
        const focusNodeId =
            selection.id && selection.id !== END_NODE_ID ? selection.id : null;
        return { focusNodeId, focusChoiceId: null };
    }

    if (selection.kind === GRAPH_SELECTION_KIND.EDGE && selection.id && tree) {
        const edge = tree.transitions.find((transition) => transition.id === selection.id);
        if (edge) {
            return {
                focusNodeId: edge.fromNodeId,
                focusChoiceId: edge.fromChoiceId,
            };
        }
    }

    return { focusNodeId: null, focusChoiceId: null };
}
