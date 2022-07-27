import * as Lint from '../test-project/node_modules/tslint/lib/index';
import * as ts from '../test-project/node_modules/typescript';
import { Helper } from './helper';

export class Rule extends Lint.Rules.AbstractRule {
    public static metadata: Lint.IRuleMetadata = {
        ruleName: 'ng-on-destroy',
        description: 'Enforces ngOnDestory hook on component classes',
        optionsDescription: 'Not configurable.',
        options: null,
        type: 'maintainability',
        typescriptOnly: false
    }

    public static FAILURE_STRING = 'Class name must have the ngOnDestroy hook';
    
    public static ALLOWED_NODES = new Set<ts.SyntaxKind>([
    ]);

    public apply(sourceFile: ts.SourceFile): Lint.RuleFailure[] {
        return this.applyWithWalker(new NgOnDestroyWalker(sourceFile, Rule.metadata.ruleName,  new Set(this.ruleArguments.map(String)), new Helper()));
    }
}

class NgOnDestroyWalker extends Lint.AbstractWalker<Set<string>> {
    helper: Helper;
    
    constructor (sourceFile: ts.SourceFile, ruleName: string, options: any, helper: Helper) {
        super(sourceFile, ruleName, options);
        this.helper = helper;
    }

    public walk(sourceFile: ts.SourceFile) {
        const cb = (node: ts.Node): void => {
            if (ts.isClassDeclaration(node)) {
                this.checkNgOnDestroy(node);
            } else {
                return ts.forEachChild(node, cb);
            }
        };

        return ts.forEachChild(sourceFile, cb);
    }

    isNamedClass(node: ts.Node): node is (ts.ClassDeclaration & { name: ts.Identifier }) {
        return (node.kind === ts.SyntaxKind.ClassDeclaration) && ((node as ts.ClassDeclaration).name != null);
    }

    checkNgOnDestroy(node: ts.ClassDeclaration) {
        if (!this.helper.hasNgOnDestroyMethod(node) && this.helper.isComponent(node)) {
            const fixes = this.helper.getAllOnDestroyFixes(node);
            if (this.isNamedClass(node)) {
                this.addFailureAtNode(node.name, Rule.FAILURE_STRING, fixes);
            }
        }
    }
}
