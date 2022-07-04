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
                        const findAllIdentifiers = (ctxNode) => {
                            const identifiers: ts.Identifier[] = [];
                            const findIdentifier = (node) => {
                                if (ts.isIdentifier(node)) {
                                    identifiers.push(node);
                                }
                                return ts.forEachChild(node, findIdentifier);
                            }
                            ts.forEachChild(ctxNode, findIdentifier);
                            return identifiers;
                        }
                        const allStatementIdentifiers = ts.forEachChild(statement, findAllIdentifiers);

                        if (allStatementIdentifiers && allStatementIdentifiers?.length > 0) {
                            for (const identifier of allStatementIdentifiers) {
                                if (identifier && identifier.getText() === 'subscribe') {
                                    const addTakeUntilWithPipeArgument = new Lint.Replacement(identifier.getStart() - 1, 0, `.pipe(takeUntil(this.componentDestroyed$))`);
                                    fix.push(addTakeUntilWithPipeArgument);                                    
                                }
                            }
                        }
                        // takeUntilImport => 'rxjs/operators'
                        let implementedTypes = node.heritageClauses?.[0].types;
                        let iTakeUntilImported = implementedTypes?.find(a => (a.expression as any).escapedText === 'takeUntil');
                        if (!iTakeUntilImported && implementedTypes) {
                            const findImportDeclarationStatements = node.getSourceFile().statements.filter(ts.isImportDeclaration);
                            if (findImportDeclarationStatements) {
                                let importTakeUntilFix;
                                for (const importStatement of findImportDeclarationStatements) {
                                    if(importStatement?.moduleSpecifier?.getText().includes('rxjs/operators') && importStatement.importClause) {
                                        importTakeUntilFix = new Lint.Replacement(importStatement.importClause?.getEnd() - 2, 0, ', takeUntil');
                                    }
                                }
                                if(!importTakeUntilFix) {
                                    const lastImport = findImportDeclarationStatements[findImportDeclarationStatements.length - 1];
                                    importTakeUntilFix = new Lint.Replacement(lastImport.getEnd(), 0, `\nimport { takeUntil} from 'rxjs/operators';`);
                                }
                                fix.push(importTakeUntilFix);
                            }
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
