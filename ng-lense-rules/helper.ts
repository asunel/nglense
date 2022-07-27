import * as ts from '../test-project/node_modules/typescript';
import * as Lint from '../test-project/node_modules/tslint/lib/index';


export class Helper {
  public isComponent(node: ts.ClassDeclaration) {
    return node.decorators && node.decorators.filter(d => d.getFullText().trim().startsWith('@Component')).length > 0;
  }

  isNgOnDestroyMethod(node: ts.ClassElement): node is ts.MethodDeclaration {
      return ts.isMethodDeclaration(node) && (node.name as ts.Identifier).text == 'ngOnDestroy';
  }

  hasNgOnDestroyMethod(node: ts.ClassDeclaration): boolean {
      return node.members.filter(node => this.isNgOnDestroyMethod(node)).length > 0;
  }

  getNgOnDestroyMethod(node: ts.ClassDeclaration): ts.MethodDeclaration {
      const n = node.members
          .filter(node => this.isNgOnDestroyMethod(node))
          .map(node => node as ts.MethodDeclaration);
      return n[0];
  }

  createNgOnDestroyMethod() {
      return ts.createMethod(
        undefined,
        undefined,
        undefined,
        'ngOnDestroy',
        undefined,
        [],
        [],
        undefined,
        ts.createBlock([], true)
      );
  }

  getNgOnDestroyMethodFix(startPos, endPos = 0, nextCompleteReqd?): Lint.Replacement {
    if(nextCompleteReqd) {
        return new Lint.Replacement(startPos, endPos, `\n\n\tngOnDestroy() {\n\t\tthis.componentDestroyed$?.next();\n\t\tthis.componentDestroyed$?.complete();\n\t}`);

    }
    return new Lint.Replacement(startPos, endPos, `\n\n\tngOnDestroy() {\n\t}`);
  }

  implementOnDestroyFix(node: ts.ClassDeclaration): Lint.Replacement[] {
    let implementOnDestroy, importOnDestroy;
    const implementedTypes = node.heritageClauses?.[0].types;
    const isOnDestroyImplemented = implementedTypes?.find(a => (a.expression as any).escapedText === 'OnDestroy');
    if (!isOnDestroyImplemented && implementedTypes) {
        const findImportDeclarationStatements = node.getSourceFile().statements.filter(ts.isImportDeclaration);
        if (findImportDeclarationStatements) {
            for (const importStatement of findImportDeclarationStatements) {
                if(importStatement?.moduleSpecifier?.getText().includes('angular/core') && importStatement.importClause) {
                    importOnDestroy = new Lint.Replacement(importStatement.importClause?.getEnd() - 2, 0, ', OnDestroy');
                }
            }
        }
        implementOnDestroy = new Lint.Replacement(implementedTypes.end, 0, ', OnDestroy');
    }
    return [implementOnDestroy, importOnDestroy];
  }

  getAllOnDestroyFixes(node: ts.ClassDeclaration, nextCompleteReqd?): Lint.Replacement[] {
    let fixes: Lint.Replacement[] = [];
    const methods = node.members.filter(ts.isMethodDeclaration);
    const lastMethod = methods[methods.length - 1];
    if (lastMethod) {
        fixes = [this.getNgOnDestroyMethodFix(lastMethod.getEnd(), 0, nextCompleteReqd)];
        const implementOnDestroy = this.implementOnDestroyFix(node);
        if(implementOnDestroy.filter(fix => fix).length > 0) {
            fixes.push(...implementOnDestroy);
        }

    }
    return fixes;
  }

  findAllIdentifiers (ctxNode) {
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

  getPipeFix(statement: ts.Statement): Lint.Replacement {
    const allStatementIdentifiers = ts.forEachChild(statement, this.findAllIdentifiers);
    let addTakeUntilWithPipeArgument;
    if (allStatementIdentifiers && allStatementIdentifiers?.length > 0) {
        for (const identifier of allStatementIdentifiers) {
            if (identifier && identifier.getText() === 'subscribe') {
                addTakeUntilWithPipeArgument = new Lint.Replacement(identifier.getStart() - 1, 0, `.pipe(takeUntil(this.componentDestroyed$))`);
            }
        }
    }
    return addTakeUntilWithPipeArgument;
  }

  getAllInnerMethod(mtx, classMethods) {
    const allInnerMethods: ts.MethodDeclaration[] = []
    const getInnerMethod = (methodToBeChecked: ts.MethodDeclaration) => {
        const methodIdentifierstexts = this.findAllIdentifiers(methodToBeChecked.body).map(_ => _.getText())
        const innerMethod = classMethods.filter(method => methodIdentifierstexts.includes(method.name.getText()));
        if(innerMethod?.length > 0) {
            try {
                for (const method of innerMethod) {
                    allInnerMethods.push(method);
                    getInnerMethod(method);
                }
                return ;                            
            } catch (error) {
                console.error('FOUND ERROR IN CODE');
                return;
            }
        } else {
            return allInnerMethods;
        }
    }
    getInnerMethod(mtx);
    return allInnerMethods;
  }

  nextCompleteInDestroyMethod(node: ts.ClassDeclaration, takeUntilArgs?): Lint.Replacement[] {
    const classMethods = node.members.filter(ts.isMethodDeclaration);
    const ngOnDestroyMethod = classMethods.find(method => method.getText().match(/ngOnDestroy/g));
    let fixes: Lint.Replacement[] = []
    let hasNextComplete;
    // TODO: check if next complete is implemented for child
    if(ngOnDestroyMethod) {
        const results = this.getAllInnerMethod(ngOnDestroyMethod, classMethods);
        const methodBodies = results.map(_ => _?.body?.getText());
        methodBodies.push(ngOnDestroyMethod.body?.getText());
        if(takeUntilArgs) {
            for (const argument of takeUntilArgs) {
                if(!hasNextComplete) {
                    hasNextComplete = this.checkNextCompleteExist(argument.getText().split('.').pop(), (methodBodies as string[]));
                }
            }
        } else {
            hasNextComplete = this.checkNextCompleteExist('componentDestroyed$', (methodBodies as string[]));
        }
        if(!hasNextComplete) {
            const bodyPosition = ngOnDestroyMethod?.body?.getStart();
            if(bodyPosition) {
                fixes.push(this.getNextCompleteInsideDestroyMethod(bodyPosition+1))
            }
        }
    } else {
        fixes.push(...this.getAllOnDestroyFixes(node, true));
    }
    return fixes;
  }

  checkNextCompleteExist(argName: string, methodBodies: string[]): boolean {
    let hasNextComplete = false
    for (const body of methodBodies) {
        if(!hasNextComplete) {
            hasNextComplete = (body?.includes(`${argName}?.next()`) || body?.includes(`${argName}.next()`))
            && (body?.includes(`${argName}?.complete()`) || body?.includes(`${argName}.complete()`));
        }
    }
    return hasNextComplete
  }

  getNextCompleteInsideDestroyMethod(bodyStartPostion, length = 0): Lint.Replacement {
    return new Lint.Replacement(bodyStartPostion, length, '\n\t\tthis.componentDestroyed$?.next();\n\t\tthis.componentDestroyed$?.complete();\n\t');
  }

  importTakeUntil(node: ts.ClassDeclaration): Lint.Replacement {
    let implementedTypes = node.heritageClauses?.[0].types;
    let importTakeUntilFix;
    let iTakeUntilImported = implementedTypes?.find(a => (a.expression as any).escapedText === 'takeUntil');
    if (!iTakeUntilImported && implementedTypes) {
        const findImportDeclarationStatements = node.getSourceFile().statements.filter(ts.isImportDeclaration);
        if (findImportDeclarationStatements) {
            let importTakeUntilExists = false;
            for (const importStatement of findImportDeclarationStatements) {
                importTakeUntilExists = importStatement?.getText().includes('takeUntil')
                if(importStatement?.moduleSpecifier?.getText().includes('rxjs/operators') && !importTakeUntilExists && importStatement.importClause ) {
                    importTakeUntilFix = new Lint.Replacement(importStatement.importClause?.getEnd() - 2, 0, ', takeUntil');
                }
            }
            if(!importTakeUntilFix && !importTakeUntilExists) {
                const lastImport = findImportDeclarationStatements[findImportDeclarationStatements.length - 1];
                importTakeUntilFix = new Lint.Replacement(lastImport.getEnd(), 0, `\nimport { takeUntil } from 'rxjs/operators';`);
            }
        }
    }
    return importTakeUntilFix;
  }

  declareOnDestroySubjectProperty(node: ts.ClassDeclaration): Lint.Replacement {
    const classProperties = node.members.filter(ts.isPropertyDeclaration);
    let privateProperty;
    if (classProperties?.filter(property => property.getText().match(/componentDestroyed\$/g)).length === 0) {
        privateProperty = new Lint.Replacement(classProperties[classProperties.length - 1].end, 0, '\n\n\tprivate componentDestroyed$ = new Subject();');
    }
    return privateProperty;
  }

}