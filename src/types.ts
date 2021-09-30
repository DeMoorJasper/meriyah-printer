import type { ESTree } from "meriyah";
import type { State } from "./core";

export type ExpressionPrecedence = Partial<{
  [type in ESTree.Node["type"]]: number;
}>;

export type CodeGenerator = Partial<{
  [type in ESTree.Node["type"]]: (node: ESTree.Node, state: State) => void;
}>;

/**
 * Code generator options.
 */
export interface Options {
  /**
   * String to use for indentation, defaults to `"␣␣"`.
   */
  indent?: string;
  /**
   * String to use for line endings, defaults to `"\n"`.
   */
  lineEnd?: string;
  /**
   * Indent level to start from, defaults to `0`.
   */
  startingIndentLevel?: number;
  /**
   * Generate comments if `true`, defaults to `false`.
   */
  comments?: boolean;
  /**
   * Custom code generator logic.
   */
  generator?: CodeGenerator;

  /**
   * Precedence of expressions
   */
  expressionsPrecedence?: ExpressionPrecedence;
}
