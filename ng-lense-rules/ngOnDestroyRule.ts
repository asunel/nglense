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
        return this.applyWithWalker(new NgOnDestroyWalker(sourceFile, Rule.metadata.ruleName,  new Set(this.ruleArguments.map(String))));
    }
}

class NgOnDestroyWalker extends Lint.AbstractWalker<Set<string>> {
    helper: Helper = new Helper();
    
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
        const methods = node.members.filter(ts.isMethodDeclaration);
        if (!this.helper.hasNgOnDestroyMethod(node) && this.helper.isComponent(node)) {
            const lastMethod = methods[methods.length - 1];
            if (lastMethod) {
                // let destroyMethod = this.helper.createNgOnDestroyMethod();
                const fix = new Lint.Replacement(lastMethod.getEnd(), 0, `\n\n\tngOnDestroy() {\n\t}`);

                if (this.isNamedClass(node)) {
                    // const className = (node.name as ts.Identifier).text;
                    this.addFailureAtNode(node.name, Rule.FAILURE_STRING, fix);
                }
            }
        }
    }
}
