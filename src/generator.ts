import { ESTree } from "meriyah";

import { NEEDS_PARENTHESES } from "./constants";
import { State } from "./core";
import {
  formatComments,
  formatVariableDeclaration,
  formatSequence,
  expressionNeedsParenthesis,
  formatExpression,
  hasCallExpression,
} from "./utils";

export const GENERATOR = {
  // Default generator.
  Program(node, state) {
    const indent = state.indent.repeat(state.indentLevel);
    const { lineEnd, writeComments } = state;
    if (writeComments && node.comments != null) {
      formatComments(state, node.comments, indent, lineEnd);
    }
    const statements = node.body;
    const { length } = statements;
    for (let i = 0; i < length; i++) {
      const statement = statements[i];
      if (writeComments && statement.comments != null) {
        formatComments(state, statement.comments, indent, lineEnd);
      }
      state.write(indent);
      this[statement.type](statement, state);
      state.write(lineEnd);
    }
    if (writeComments && node.trailingComments != null) {
      formatComments(state, node.trailingComments, indent, lineEnd);
    }
  },
  BlockStatement(node, state) {
    const indent = state.indent.repeat(state.indentLevel++);
    const { lineEnd, writeComments } = state;
    const statementIndent = indent + state.indent;
    state.write("{");
    const statements = node.body;
    if (statements != null && statements.length > 0) {
      state.write(lineEnd);
      if (writeComments && node.comments != null) {
        formatComments(state, node.comments, statementIndent, lineEnd);
      }
      const { length } = statements;
      for (let i = 0; i < length; i++) {
        const statement = statements[i];
        if (writeComments && statement.comments != null) {
          formatComments(state, statement.comments, statementIndent, lineEnd);
        }
        state.write(statementIndent);
        this[statement.type](statement, state);
        state.write(lineEnd);
      }
      state.write(indent);
    } else {
      if (writeComments && node.comments != null) {
        state.write(lineEnd);
        formatComments(state, node.comments, statementIndent, lineEnd);
        state.write(indent);
      }
    }
    if (writeComments && node.trailingComments != null) {
      formatComments(state, node.trailingComments, statementIndent, lineEnd);
    }
    state.write("}");
    state.indentLevel--;
  },
  ClassBody(node, state) {
    this.BlockStatement(node, state);
  },
  EmptyStatement(node, state) {
    state.write(";");
  },
  ExpressionStatement(node: ESTree.ExpressionStatement, state: State) {
    const precedence = state.expressionsPrecedence[node.expression.type];
    if (
      precedence === NEEDS_PARENTHESES ||
      // @ts-ignore
      (precedence === 3 && node.expression.left.type[0] === "O")
    ) {
      // Should always have parentheses or is an AssignmentExpression to an ObjectPattern
      state.write("(");
      this[node.expression.type](node.expression, state);
      state.write(")");
    } else {
      this[node.expression.type](node.expression, state);
    }
    state.write(";");
  },
  IfStatement(node, state) {
    state.write("if (");
    this[node.test.type](node.test, state);
    state.write(") ");
    this[node.consequent.type](node.consequent, state);
    if (node.alternate != null) {
      state.write(" else ");
      this[node.alternate.type](node.alternate, state);
    }
  },
  LabeledStatement(node, state) {
    this[node.label.type](node.label, state);
    state.write(": ");
    this[node.body.type](node.body, state);
  },
  BreakStatement(node, state) {
    state.write("break");
    if (node.label != null) {
      state.write(" ");
      this[node.label.type](node.label, state);
    }
    state.write(";");
  },
  ContinueStatement(node, state) {
    state.write("continue");
    if (node.label != null) {
      state.write(" ");
      this[node.label.type](node.label, state);
    }
    state.write(";");
  },
  WithStatement(node, state) {
    state.write("with (");
    this[node.object.type](node.object, state);
    state.write(") ");
    this[node.body.type](node.body, state);
  },
  SwitchStatement(node, state) {
    const indent = state.indent.repeat(state.indentLevel++);
    const { lineEnd, writeComments } = state;
    state.indentLevel++;
    const caseIndent = indent + state.indent;
    const statementIndent = caseIndent + state.indent;
    state.write("switch (");
    this[node.discriminant.type](node.discriminant, state);
    state.write(") {" + lineEnd);
    const { cases: occurences } = node;
    const { length: occurencesCount } = occurences;
    for (let i = 0; i < occurencesCount; i++) {
      const occurence = occurences[i];
      if (writeComments && occurence.comments != null) {
        formatComments(state, occurence.comments, caseIndent, lineEnd);
      }
      if (occurence.test) {
        state.write(caseIndent + "case ");
        this[occurence.test.type](occurence.test, state);
        state.write(":" + lineEnd);
      } else {
        state.write(caseIndent + "default:" + lineEnd);
      }
      const { consequent } = occurence;
      const { length: consequentCount } = consequent;
      for (let i = 0; i < consequentCount; i++) {
        const statement = consequent[i];
        if (writeComments && statement.comments != null) {
          formatComments(state, statement.comments, statementIndent, lineEnd);
        }
        state.write(statementIndent);
        this[statement.type](statement, state);
        state.write(lineEnd);
      }
    }
    state.indentLevel -= 2;
    state.write(indent + "}");
  },
  ReturnStatement(node, state) {
    state.write("return");
    if (node.argument) {
      state.write(" ");
      this[node.argument.type](node.argument, state);
    }
    state.write(";");
  },
  ThrowStatement(node, state) {
    state.write("throw ");
    this[node.argument.type](node.argument, state);
    state.write(";");
  },
  TryStatement(node, state) {
    state.write("try ");
    this[node.block.type](node.block, state);
    if (node.handler) {
      const { handler } = node;
      if (handler.param == null) {
        state.write(" catch ");
      } else {
        state.write(" catch (");
        this[handler.param.type](handler.param, state);
        state.write(") ");
      }
      this[handler.body.type](handler.body, state);
    }
    if (node.finalizer) {
      state.write(" finally ");
      this[node.finalizer.type](node.finalizer, state);
    }
  },
  WhileStatement(node, state) {
    state.write("while (");
    this[node.test.type](node.test, state);
    state.write(") ");
    this[node.body.type](node.body, state);
  },
  DoWhileStatement(node, state) {
    state.write("do ");
    this[node.body.type](node.body, state);
    state.write(" while (");
    this[node.test.type](node.test, state);
    state.write(");");
  },
  ForStatement(node, state) {
    state.write("for (");
    if (node.init != null) {
      const { init } = node;
      if (init.type[0] === "V") {
        formatVariableDeclaration(state, init);
      } else {
        this[init.type](init, state);
      }
    }
    state.write("; ");
    if (node.test) {
      this[node.test.type](node.test, state);
    }
    state.write("; ");
    if (node.update) {
      this[node.update.type](node.update, state);
    }
    state.write(") ");
    this[node.body.type](node.body, state);
  },
  ForInStatement(node, state) {
    state.write(`for ${node.await ? "await " : ""}(`);
    const { left } = node;
    if (left.type[0] === "V") {
      formatVariableDeclaration(state, left);
    } else {
      this[left.type](left, state);
    }
    // Identifying whether node.type is `ForInStatement` or `ForOfStatement`
    state.write(node.type[3] === "I" ? " in " : " of ");
    this[node.right.type](node.right, state);
    state.write(") ");
    this[node.body.type](node.body, state);
  },
  ForOfStatement(node, state) {
    this.ForInStatement(node, state);
  },
  DebuggerStatement(node, state) {
    state.write("debugger;", node);
  },
  FunctionDeclaration(node, state) {
    state.write(
      (node.async ? "async " : "") +
        (node.generator ? "function* " : "function ") +
        (node.id ? node.id.name : ""),
      node
    );
    formatSequence(state, node.params);
    state.write(" ");
    this[node.body.type](node.body, state);
  },
  FunctionExpression(node, state) {
    this.FunctionDeclaration(node, state);
  },
  VariableDeclaration(node, state) {
    formatVariableDeclaration(state, node);
    state.write(";");
  },
  VariableDeclarator(node, state) {
    this[node.id.type](node.id, state);
    if (node.init != null) {
      state.write(" = ");
      this[node.init.type](node.init, state);
    }
  },
  ClassDeclaration(node, state) {
    state.write("class " + (node.id ? `${node.id.name} ` : ""), node);
    if (node.superClass) {
      state.write("extends ");
      const { superClass } = node;
      const { type } = superClass;
      const precedence = state.expressionsPrecedence[type];
      if (
        (type[0] !== "C" || type[1] !== "l" || type[5] !== "E") &&
        (precedence === NEEDS_PARENTHESES ||
          precedence < state.expressionsPrecedence.ClassExpression)
      ) {
        // Not a ClassExpression that needs parentheses
        state.write("(");
        this[node.superClass.type](superClass, state);
        state.write(")");
      } else {
        this[superClass.type](superClass, state);
      }
      state.write(" ");
    }
    this.ClassBody(node.body, state);
  },
  ImportDeclaration(node, state) {
    state.write("import ");
    const { specifiers } = node;
    const { length } = specifiers;
    // TODO: Once babili is fixed, put this after condition
    // https://github.com/babel/babili/issues/430
    let i = 0;
    if (length > 0) {
      for (; i < length; ) {
        if (i > 0) {
          state.write(", ");
        }
        const specifier = specifiers[i];
        const type = specifier.type[6];
        if (type === "D") {
          // ImportDefaultSpecifier
          state.write(specifier.local.name, specifier);
          i++;
        } else if (type === "N") {
          // ImportNamespaceSpecifier
          state.write("* as " + specifier.local.name, specifier);
          i++;
        } else {
          // ImportSpecifier
          break;
        }
      }
      if (i < length) {
        state.write("{");
        for (;;) {
          const specifier = specifiers[i];
          const { name } = specifier.imported;
          state.write(name, specifier);
          if (name !== specifier.local.name) {
            state.write(" as " + specifier.local.name);
          }
          if (++i < length) {
            state.write(", ");
          } else {
            break;
          }
        }
        state.write("}");
      }
      state.write(" from ");
    }
    this.Literal(node.source, state);
    state.write(";");
  },
  ImportExpression(node, state) {
    state.write("import(");
    this[node.source.type](node.source, state);
    state.write(")");
  },
  ExportDefaultDeclaration(
    node: ESTree.ExportDefaultDeclaration,
    state: State
  ) {
    state.write("export default ");
    this[node.declaration.type](node.declaration, state);
    if (
      state.expressionsPrecedence[node.declaration.type] != null &&
      node.declaration.type[0] !== "F"
    ) {
      // All expression nodes except `FunctionExpression`
      state.write(";");
    }
  },
  ExportNamedDeclaration(node, state) {
    state.write("export ");
    if (node.declaration) {
      this[node.declaration.type](node.declaration, state);
    } else {
      state.write("{");
      const { specifiers } = node,
        { length } = specifiers;
      if (length > 0) {
        for (let i = 0; ; ) {
          const specifier = specifiers[i];
          const { name } = specifier.local;
          state.write(name, specifier);
          if (name !== specifier.exported.name) {
            state.write(" as " + specifier.exported.name);
          }
          if (++i < length) {
            state.write(", ");
          } else {
            break;
          }
        }
      }
      state.write("}");
      if (node.source) {
        state.write(" from ");
        this.Literal(node.source, state);
      }
      state.write(";");
    }
  },
  ExportAllDeclaration(node, state) {
    if (node.exported != null) {
      state.write("export * as " + node.exported.name + " from ");
    } else {
      state.write("export * from ");
    }
    this.Literal(node.source, state);
    state.write(";");
  },
  MethodDefinition(node, state) {
    if (node.static) {
      state.write("static ");
    }
    const kind = node.kind[0];
    if (kind === "g" || kind === "s") {
      // Getter or setter
      state.write(node.kind + " ");
    }
    if (node.value.async) {
      state.write("async ");
    }
    if (node.value.generator) {
      state.write("*");
    }
    if (node.computed) {
      state.write("[");
      this[node.key.type](node.key, state);
      state.write("]");
    } else {
      this[node.key.type](node.key, state);
    }
    formatSequence(state, node.value.params);
    state.write(" ");
    this[node.value.body.type](node.value.body, state);
  },
  ClassExpression(node, state) {
    state.write("(");
    this.ClassDeclaration(node, state);
    state.write(")");
  },
  ArrowFunctionExpression(node, state) {
    state.write(node.async ? "async " : "", node);
    const { params } = node;
    if (params != null) {
      // Omit parenthesis if only one named parameter
      if (params.length === 1 && params[0].type[0] === "I") {
        // If params[0].type[0] starts with 'I', it can't be `ImportDeclaration` nor `IfStatement` and thus is `Identifier`
        state.write(params[0].name, params[0]);
      } else {
        formatSequence(state, node.params);
      }
    }
    state.write(" => ");
    if (node.body.type[0] === "O") {
      // Body is an object expression
      state.write("(");
      this.ObjectExpression(node.body, state);
      state.write(")");
    } else {
      this[node.body.type](node.body, state);
    }
  },
  ThisExpression(node, state) {
    state.write("this", node);
  },
  Super(node, state) {
    state.write("super", node);
  },
  RestElement(node, state) {
    state.write("...");
    this[node.argument.type](node.argument, state);
  },
  SpreadElement(node, state) {
    this.RestElement(node, state);
  },
  YieldExpression(node, state) {
    state.write(node.delegate ? "yield*" : "yield");
    if (node.argument) {
      state.write(" ");
      this[node.argument.type](node.argument, state);
    }
  },
  AwaitExpression(node, state) {
    state.write("await ", node);
    formatExpression(state, node.argument, node, false);
  },
  TemplateLiteral(node, state) {
    const { quasis, expressions } = node;
    state.write("`");
    const { length } = expressions;
    for (let i = 0; i < length; i++) {
      const expression = expressions[i];
      const quasi = quasis[i];
      state.write(quasi.value.raw, quasi);
      state.write("${");
      this[expression.type](expression, state);
      state.write("}");
    }
    const quasi = quasis[quasis.length - 1];
    state.write(quasi.value.raw, quasi);
    state.write("`");
  },
  TemplateElement(node, state) {
    state.write(node.value.raw, node);
  },
  TaggedTemplateExpression(node, state) {
    this[node.tag.type](node.tag, state);
    this[node.quasi.type](node.quasi, state);
  },
  ArrayExpression(node, state) {
    state.write("[");
    if (node.elements.length > 0) {
      const { elements } = node,
        { length } = elements;
      for (let i = 0; ; ) {
        const element = elements[i];
        if (element != null) {
          this[element.type](element, state);
        }
        if (++i < length) {
          state.write(", ");
        } else {
          if (element == null) {
            state.write(", ");
          }
          break;
        }
      }
    }
    state.write("]");
  },
  ArrayPattern(node, state) {
    this.ArrayExpression(node, state);
  },
  ObjectExpression(node, state) {
    const indent = state.indent.repeat(state.indentLevel++);
    const { lineEnd, writeComments } = state;
    const propertyIndent = indent + state.indent;
    state.write("{");
    if (node.properties.length > 0) {
      state.write(lineEnd);
      if (writeComments && node.comments != null) {
        formatComments(state, node.comments, propertyIndent, lineEnd);
      }
      const comma = "," + lineEnd;
      const { properties } = node,
        { length } = properties;
      for (let i = 0; ; ) {
        const property = properties[i];
        if (writeComments && property.comments != null) {
          formatComments(state, property.comments, propertyIndent, lineEnd);
        }
        state.write(propertyIndent);
        this[property.type](property, state);
        if (++i < length) {
          state.write(comma);
        } else {
          break;
        }
      }
      state.write(lineEnd);
      if (writeComments && node.trailingComments != null) {
        formatComments(state, node.trailingComments, propertyIndent, lineEnd);
      }
      state.write(indent + "}");
    } else if (writeComments) {
      if (node.comments != null) {
        state.write(lineEnd);
        formatComments(state, node.comments, propertyIndent, lineEnd);
        if (node.trailingComments != null) {
          formatComments(state, node.trailingComments, propertyIndent, lineEnd);
        }
        state.write(indent + "}");
      } else if (node.trailingComments != null) {
        state.write(lineEnd);
        formatComments(state, node.trailingComments, propertyIndent, lineEnd);
        state.write(indent + "}");
      } else {
        state.write("}");
      }
    } else {
      state.write("}");
    }
    state.indentLevel--;
  },
  Property(node, state) {
    if (node.method || node.kind[0] !== "i") {
      // Either a method or of kind `set` or `get` (not `init`)
      this.MethodDefinition(node, state);
    } else {
      if (!node.shorthand) {
        if (node.computed) {
          state.write("[");
          this[node.key.type](node.key, state);
          state.write("]");
        } else {
          this[node.key.type](node.key, state);
        }
        state.write(": ");
      }
      this[node.value.type](node.value, state);
    }
  },
  ObjectPattern(node, state) {
    state.write("{");
    if (node.properties.length > 0) {
      const { properties } = node,
        { length } = properties;
      for (let i = 0; ; ) {
        this[properties[i].type](properties[i], state);
        if (++i < length) {
          state.write(", ");
        } else {
          break;
        }
      }
    }
    state.write("}");
  },
  SequenceExpression(node, state) {
    formatSequence(state, node.expressions);
  },
  UnaryExpression(node, state) {
    if (node.prefix) {
      const {
        operator,
        argument,
        argument: { type },
      } = node;
      state.write(operator);
      const needsParentheses = expressionNeedsParenthesis(
        state,
        argument,
        node,
        false
      );
      if (
        !needsParentheses &&
        (operator.length > 1 ||
          (type[0] === "U" &&
            (type[1] === "n" || type[1] === "p") &&
            argument.prefix &&
            argument.operator[0] === operator &&
            (operator === "+" || operator === "-")))
      ) {
        // Large operator or argument is UnaryExpression or UpdateExpression node
        state.write(" ");
      }
      if (needsParentheses) {
        state.write(operator.length > 1 ? " (" : "(");
        this[type](argument, state);
        state.write(")");
      } else {
        this[type](argument, state);
      }
    } else {
      // FIXME: This case never occurs
      this[node.argument.type](node.argument, state);
      state.write(node.operator);
    }
  },
  UpdateExpression(node, state) {
    // Always applied to identifiers or members, no parenthesis check needed
    if (node.prefix) {
      state.write(node.operator);
      this[node.argument.type](node.argument, state);
    } else {
      this[node.argument.type](node.argument, state);
      state.write(node.operator);
    }
  },
  AssignmentExpression(node, state) {
    this[node.left.type](node.left, state);
    state.write(" " + node.operator + " ");
    this[node.right.type](node.right, state);
  },
  AssignmentPattern(node, state) {
    this[node.left.type](node.left, state);
    state.write(" = ");
    this[node.right.type](node.right, state);
  },
  BinaryExpression(node, state) {
    const isIn = node.operator === "in";
    if (isIn) {
      // Avoids confusion in `for` loops initializers
      state.write("(");
    }
    formatExpression(state, node.left, node, false);
    state.write(" " + node.operator + " ");
    formatExpression(state, node.right, node, true);
    if (isIn) {
      state.write(")");
    }
  },
  LogicalExpression(node, state) {
    this.BinaryExpression(node, state);
  },
  ConditionalExpression(node, state) {
    const { test } = node;
    const precedence = state.expressionsPrecedence[test.type];
    if (
      precedence === NEEDS_PARENTHESES ||
      precedence <= state.expressionsPrecedence.ConditionalExpression
    ) {
      state.write("(");
      this[test.type](test, state);
      state.write(")");
    } else {
      this[test.type](test, state);
    }
    state.write(" ? ");
    this[node.consequent.type](node.consequent, state);
    state.write(" : ");
    this[node.alternate.type](node.alternate, state);
  },
  NewExpression(node, state) {
    state.write("new ");
    const precedence = state.expressionsPrecedence[node.callee.type];
    if (
      precedence === NEEDS_PARENTHESES ||
      precedence < state.expressionsPrecedence.CallExpression ||
      hasCallExpression(node.callee)
    ) {
      state.write("(");
      this[node.callee.type](node.callee, state);
      state.write(")");
    } else {
      this[node.callee.type](node.callee, state);
    }
    formatSequence(state, node["arguments"]);
  },
  PrivateIdentifier(node: ESTree.PrivateIdentifier, state: State) {
    state.write("#" + node.name);
  },
  PropertyDefinition(node: ESTree.PropertyDefinition, state: State) {
    if (node.static) {
      state.write("static ");
    }

    this[node.key.type](node.key, state);

    if (node.value) {
      state.write(" = ");
      this[node.value.type](node.value, state);
    }
    state.write(";" + state.lineEnd);
  },
  CallExpression(node, state) {
    const precedence = state.expressionsPrecedence[node.callee.type];
    if (
      precedence === NEEDS_PARENTHESES ||
      precedence < state.expressionsPrecedence.CallExpression
    ) {
      state.write("(");
      this[node.callee.type](node.callee, state);
      state.write(")");
    } else {
      this[node.callee.type](node.callee, state);
    }
    if (node.optional) {
      state.write("?.");
    }
    formatSequence(state, node["arguments"]);
  },
  ChainExpression(node, state) {
    this[node.expression.type](node.expression, state);
  },
  MemberExpression(node, state) {
    const precedence = state.expressionsPrecedence[node.object.type];
    if (
      precedence === NEEDS_PARENTHESES ||
      precedence < state.expressionsPrecedence.MemberExpression
    ) {
      state.write("(");
      this[node.object.type](node.object, state);
      state.write(")");
    } else {
      this[node.object.type](node.object, state);
    }
    if (node.computed) {
      if (node.optional) {
        state.write("?.");
      }
      state.write("[");
      this[node.property.type](node.property, state);
      state.write("]");
    } else {
      if (node.optional) {
        state.write("?.");
      } else {
        state.write(".");
      }
      this[node.property.type](node.property, state);
    }
  },
  MetaProperty(node, state) {
    state.write(node.meta.name + "." + node.property.name, node);
  },
  Identifier(node, state) {
    state.write(node.name, node);
  },
  Literal(node, state) {
    if (node.raw != null) {
      // Non-standard property
      state.write(node.raw, node);
    } else if (node.regex != null) {
      this.RegExpLiteral(node, state);
    } else if (node.bigint != null) {
      state.write(node.bigint + "n", node);
    } else {
      state.write(JSON.stringify(node.value), node);
    }
  },
  RegExpLiteral(node, state) {
    const { regex } = node;
    state.write(`/${regex.pattern}/${regex.flags}`, node);
  },
  // <div></div>
  JSXElement(node, state) {
    state.write("<");
    this[node.openingElement.type](node.openingElement, state);
    if (node.closingElement) {
      state.write(">");
      for (let i = 0; i < node.children.length; i++) {
        const child = node.children[i];
        this[child.type](child, state);
      }
      state.write("</");
      this[node.closingElement.type](node.closingElement, state);
      state.write(">");
    } else {
      state.write(" />");
    }
  },
  // <div>
  JSXOpeningElement: function JSXOpeningElement(node, state) {
    this[node.name.type](node.name, state);
    for (let i = 0; i < node.attributes.length; i++) {
      const attr = node.attributes[i];
      this[attr.type](attr, state);
    }
  },
  // </div>
  JSXClosingElement: function JSXOpeningElement(node, state) {
    this[node.name.type](node.name, state);
  },
  // div
  JSXIdentifier: function JSXOpeningElement(node, state) {
    state.write(node.name);
  },
  // Member.Expression
  JSXMemberExpression: function JSXMemberExpression(node, state) {
    this[node.object.type](node.object, state);
    state.write(".");
    this[node.property.type](node.property, state);
  },
  // attr="something"
  JSXAttribute: function JSXAttribute(node, state) {
    state.write(" ");
    this[node.name.type](node.name, state);
    state.write("=");
    this[node.value.type](node.value, state);
  },
  // namespaced:attr="something"
  JSXNamespacedName: function JSXNamespacedName(node, state) {
    this[node.namespace.type](node.namespace, state);
    state.write(":");
    this[node.name.type](node.name, state);
  },
  // {expression}
  JSXExpressionContainer: function JSXExpressionContainer(node, state) {
    state.write("{");
    this[node.expression.type](node.expression, state);
    state.write("}");
  },
  JSXText(node, state) {
    state.write(node.value);
  },
};
