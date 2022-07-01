import * as ts from '../test-project/node_modules/typescript';

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
}