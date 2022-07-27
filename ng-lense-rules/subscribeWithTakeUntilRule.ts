import * as Lint from '../test-project/node_modules/tslint/lib/index';
import * as ts from '../test-project/node_modules/typescript/lib/typescript';
import { Helper } from './helper';


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

    public static ALLOWED_NODES = new Set<ts.SyntaxKind>([]);

    public apply(sourceFile: ts.SourceFile): Lint.RuleFailure[] {
        return this.applyWithWalker(new SubscribeWithTakeUntilWalker(sourceFile, Rule.metadata.ruleName,  new Set(this.ruleArguments.map(String)), new Helper()));

    }
}
class SubscribeWithTakeUntilWalker extends Lint.AbstractWalker<Set<string>> {

    helper: Helper;
    
    constructor (sourceFile: ts.SourceFile, ruleName: string, options: any, helper: Helper) {
        super(sourceFile, ruleName, options);
        this.helper = helper;
    }

    public walk(sourceFile: ts.SourceFile) {
        const cb = (node: ts.Node): void => {
            if (ts.isClassDeclaration(node)) {
                this.checkSubscribeWithTakeUntil(node);
            } else {
                return ts.forEachChild(node, cb);
            }
        };

        return ts.forEachChild(sourceFile, cb);
    }

    checkSubscribeWithTakeUntil(node: ts.ClassDeclaration) {
        const classMethods = node.members.filter(ts.isMethodDeclaration);

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
                    const fix: Lint.Replacement[] = [];
                    if (statementText.match(/takeUntil\(/g)) {
                        let argNodes;
                        const identifierFn = (ctxNode) => {
                            if(ctxNode.getText().startsWith('takeUntil') && ctxNode.getText().endsWith(')')) {
                                if(ctxNode?.arguments?.length) {
                                    argNodes = ctxNode.arguments;
                                }
                            }
                            return ts.forEachChild(ctxNode, identifierFn);
                        }
                        ts.forEachChild(statement, identifierFn);
                        const nextCompleteSubjectFix = this.helper.nextCompleteInDestroyMethod(node, argNodes);
                        const importFix = this.helper.importTakeUntil(node);
                        if(importFix) {
                            fix.push(importFix);
                        }
                        const componentDestroyedProperty = this.helper.declareOnDestroySubjectProperty(node);
                        if(componentDestroyedProperty) {
                            fix.push(componentDestroyedProperty);
                        }
                        if(nextCompleteSubjectFix.filter(_ => _).length > 0) {
                            fix.push(...nextCompleteSubjectFix);
                            this.addFailureAtNode(statement, Rule.FAILURE_STRING, fix);
                        }
                    } else {
                        const pipeFix = this.helper.getPipeFix(statement);
                        if(pipeFix) {
                            fix.push(pipeFix);
                        }
                        const importFix = this.helper.importTakeUntil(node);
                        if(importFix) {
                            fix.push(importFix);
                        }
                        const componentDestroyedProperty = this.helper.declareOnDestroySubjectProperty(node);
                        if(componentDestroyedProperty) {
                            fix.push(componentDestroyedProperty);
                        }
                        const nextCompleteSubjectFix = this.helper.nextCompleteInDestroyMethod(node);
                        if(nextCompleteSubjectFix.filter(_ => _).length > 0) {
                            fix.push(...nextCompleteSubjectFix);
                        }
                        this.addFailureAtNode(statement, Rule.FAILURE_STRING, fix);
                    }
                }
            }

        }
    }
}
