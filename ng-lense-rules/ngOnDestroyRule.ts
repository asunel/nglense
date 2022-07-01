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
    public apply(sourceFile: ts.SourceFile): Lint.RuleFailure[] {
        return this.applyWithWalker(new NgOnDestroyWalker(sourceFile, this.getOptions(), new Helper()));
    }
}
class NgOnDestroyWalker extends Lint.RuleWalker {
    helper: Helper
    constructor(sourceFile: ts.SourceFile, options: Lint.IOptions, helper: Helper) {
        super(sourceFile, options);
        this.helper = helper;
    }

    visitClassDeclaration(node: ts.ClassDeclaration) {
        this.validateMethods(node)
    }
    
    validateMethods(node: ts.ClassDeclaration) {
        const methods = node.members.filter(ts.isMethodDeclaration);
        if (!this.helper.hasNgOnDestroyMethod(node) && this.helper.isComponent(node)) {
            const lastMethod = methods[methods.length - 1];
            if (lastMethod) {
                // let destroyMethod = this.helper.createNgOnDestroyMethod();
                const fix = new Lint.Replacement(lastMethod.getEnd(), 0, `\n\n  ngOnDestroy() {\n\n  }`);
                this.addFailureAtNode(node, Rule.FAILURE_STRING, fix);
            }
        }
    }

}
