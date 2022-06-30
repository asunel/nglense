import * as Lint from '../test-project/node_modules/tslint/lib/index';
import * as ts from '../test-project/node_modules/typescript';

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
    public apply(sourceFile: ts.SourceFile): Lint.RuleFailure[] {
        return this.applyWithWalker(new NgOnDestroyWalker(sourceFile, this.getOptions()));
    }
}
class NgOnDestroyWalker extends Lint.RuleWalker {
    visitClassDeclaration(node: ts.ClassDeclaration) {
        this.validateMethods(node)
    }
    validateMethods(node: ts.ClassDeclaration) {
        const hasComponentDecorator = node.decorators && node.decorators[0] && node.decorators[0].getText().includes('@Component')
        const methods = node.members.filter(ts.isMethodDeclaration);
        const methodNames = methods.map(m => m?.name.getText());
        const ngOnDestroyArr = methodNames.filter( methodName => methodName === 'ngOnDestroy');
        if (ngOnDestroyArr.length === 0 && hasComponentDecorator) {
            const lastMethod = methods[methods.length - 1];
            const fix = new Lint.Replacement(lastMethod.getEnd(), 0, `\n\n  ngOnDestroy() {\n\n  }`);
            this.addFailureAtNode(node, Rule.FAILURE_STRING, fix);
        }
    }
}
