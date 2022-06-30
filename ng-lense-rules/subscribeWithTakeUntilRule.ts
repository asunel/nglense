import * as Lint from '../test-project/node_modules/tslint/lib/index';
import * as ts from '../test-project/node_modules/typescript/lib/typescript';


export class Rule extends Lint.Rules.AbstractRule {
    public static metadata: Lint.IRuleMetadata = {
        ruleName: 'subscribe-with-takeUntil',
        description: 'Enforces use of takeUntil operator for rxjs subscriptions',
        optionsDescription: 'Not configurable.',
        options: null,
        type: 'maintainability',
        typescriptOnly: false
    }
    public static FAILURE_STRING = 'Subscriptions must have takeUntil to avoid memory leak';
    public apply(sourceFile: ts.SourceFile): Lint.RuleFailure[] {
        return this.applyWithWalker(new NgOnDestroyWalker(sourceFile, this.getOptions()))
    }
}
class NgOnDestroyWalker extends Lint.RuleWalker {
    visitClassDeclaration(node: ts.ClassDeclaration) {
        this.validateMethods(node)
    }
    validateMethods(node: ts.ClassDeclaration) {
        const classMethods = node.members.filter(ts.isMethodDeclaration);
        const classProperties = node.members.filter(ts.isPropertyDeclaration);

        let subscribeStatements: ts.Statement[] = []
        if (classMethods?.length) {
            for (const method of classMethods) {
                const subscribeStatement = method?.body?.statements?.filter(statement => statement.getText().match(/\.subscribe\(/));
                if (subscribeStatement && subscribeStatement?.length > 0) {
                    subscribeStatements.push(...subscribeStatement);
                }
            }
            if (subscribeStatements.length > 0) {
                for (const statement of subscribeStatements) {
                    const statementText = statement.getText();
                    if (statementText.match(/takeUntil\(/g)) {
                        // TODO: ;
                    } else {
                        const fix: Lint.Replacement[] = [];
                        const pipeExpression = statement['expression']?.expression?.expression; // TODO: correct
                        if (pipeExpression) {
                            const addTakeUntilArgument = new Lint.Replacement(pipeExpression.end - 1, 0, `${pipeExpression?.arguments?.length ? ', ' : ''}takeUntil(this.componentDestroyed$)`);
                            fix.push(addTakeUntilArgument);
                        }
                        if (classProperties?.filter(property => property.getText().match(/componentDestroyed/g)).length === 0) {
                            const privateProperty = new Lint.Replacement(classProperties[classProperties.length - 1].end, 0, '\n\n  private componentDestroyed$ = new Subject();');
                            fix.push(privateProperty);
                        }
                        const ngOnDestroyMethod = classMethods.find(method => method.getText().match(/ngOnDestroy/g));
                        let bodyStartPostion = ngOnDestroyMethod?.body?.getStart();
                        if (bodyStartPostion) {
                            const nextCompleteSubjectFix = new Lint.Replacement(bodyStartPostion + 1, 0, '\n    this.componentDestroyed$.next();\n    this.componentDestroyed$.complete();\n  ');
                            fix.push(nextCompleteSubjectFix);
                        }
                        this.addFailureAtNode(statement, Rule.FAILURE_STRING, fix);
                    }
                }
            }

        }
    }
}
