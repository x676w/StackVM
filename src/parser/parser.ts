import { Node } from "@babel/types";
import { SVArrayExpression, SVBinaryExpression, SVBinaryOperator, SVDefinition, SVIdentifier, SVLiteral, SVLogicalExpression, SVLogicalOperator, SVNode, SVUnaryExpression, SVUnaryOperator, SVVariableDefinitionType } from "./nodes";
import { parseCode } from "../utils";
import traverse from "@babel/traverse";

export type TNodesRoot = SVNode[];

class Parser {
  private globals   : Set<string>;
  private nodesRoot : TNodesRoot;

  constructor() {
    this.globals    = new Set();
    this.nodesRoot  = [];
  };

  private scanNode(node: Node, isForRoot = true): SVNode | undefined {
    let svNode: SVNode | undefined;
    
    switch(node.type) {
      case "StringLiteral": {
        svNode = new SVLiteral("string", node.value);

        break;
      };

      case "NumericLiteral": {
        svNode = new SVLiteral("number", node.value);

        break;
      };

      case "BooleanLiteral": {
        svNode = new SVLiteral("boolean", node.value);

        break;
      };

      case "BinaryExpression": {
        const left = this.scanNode(node.left, false)!;
        const right = this.scanNode(node.right, false)!;
        const operator = node.operator as SVBinaryOperator;

        svNode = new SVBinaryExpression(left, right, operator);

        break;
      };

      case "LogicalExpression": {
        const left = this.scanNode(node.left, false)!;
        const right = this.scanNode(node.right, false)!;
        const operator = node.operator as SVLogicalOperator;

        svNode = new SVLogicalExpression(left, right, operator);

        break;
      };

      case "UnaryExpression": {
        const arg = this.scanNode(node.argument, false)!;
        const operator = node.operator as SVUnaryOperator;

        svNode = new SVUnaryExpression(arg, operator);
        
        break;
      };

      case "ArrayExpression": {
        const nodeElements = [];
        const elements = node.elements.reverse();

        for(const element of elements) {
          const node = this.scanNode(element as Node, false)!;

          nodeElements.push(node);
        };

        svNode = new SVArrayExpression(nodeElements);
        
        break;
      };

      case "ExpressionStatement": {
        this.scanNode(node.expression, false);

        break;
      };

      case "Identifier": {
        svNode = new SVIdentifier(node.name, this.globals.has(node.name));
        
        break;
      };

      case "VariableDeclaration": {
        const variables: SVVariableDefinitionType[] = [];

        for(const declarator of node.declarations) {
          if(declarator.id.type !== 'Identifier')
            continue;

          variables.push({
            name: declarator.id.name,
            constant: node.kind === "const",
            value: declarator.init ? this.scanNode(declarator.init, false) : undefined
          });
        };

        svNode = new SVDefinition(variables);
        
        break;
      };
    };

    if(svNode !== undefined && isForRoot) {
      this.nodesRoot.push(svNode);
    };

    return svNode;
  };

  public parse(code: string) {
    const tree = parseCode(code);

    traverse(tree, {
      Identifier: (path) => {
        const isGlobal = path.scope.hasGlobal(path.node.name);

        if(!isGlobal || this.globals.has(path.node.name))
          return;

        this.globals.add(path.node.name);
      }
    });

    for(const node of tree.program.body) {
      this.scanNode(node);
    };

    return this.nodesRoot;
  };
};

export default Parser;