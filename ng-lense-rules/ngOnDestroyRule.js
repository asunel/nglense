"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
exports.__esModule = true;
exports.Rule = void 0;
var Lint = require("../test-project/node_modules/tslint/lib/index");
var ts = require("../test-project/node_modules/typescript");
var Rule = /** @class */ (function (_super) {
    __extends(Rule, _super);
    function Rule() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    Rule.prototype.apply = function (sourceFile) {
        return this.applyWithWalker(new NgOnDestroyWalker(sourceFile, this.getOptions()));
    };
    Rule.metadata = {
        ruleName: 'ng-on-destroy',
        description: 'Enforces ngOnDestory hook on component classes',
        optionsDescription: 'Not configurable.',
        options: null,
        type: 'maintainability',
        typescriptOnly: false
    };
    Rule.FAILURE_STRING = 'Class name must have the ngOnDestroy hook';
    return Rule;
}(Lint.Rules.AbstractRule));
exports.Rule = Rule;
var NgOnDestroyWalker = /** @class */ (function (_super) {
    __extends(NgOnDestroyWalker, _super);
    function NgOnDestroyWalker() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    NgOnDestroyWalker.prototype.visitClassDeclaration = function (node) {
        this.validateMethods(node);
    };
    NgOnDestroyWalker.prototype.validateMethods = function (node) {
        var hasComponentDecorator = node.decorators && node.decorators[0] && node.decorators[0].getText().includes('@Component');
        var methods = node.members.filter(ts.isMethodDeclaration);
        var methodNames = methods.map(function (m) { return m === null || m === void 0 ? void 0 : m.name.getText(); });
        var ngOnDestroyArr = methodNames.filter(function (methodName) { return methodName === 'ngOnDestroy'; });
        if (ngOnDestroyArr.length === 0 && hasComponentDecorator) {
            var lastMethod = methods[methods.length - 1];
            var fix = new Lint.Replacement(lastMethod.getEnd(), 0, "\n\n  ngOnDestroy() {\n\n  }");
            this.addFailureAtNode(node, Rule.FAILURE_STRING, fix);
        }
    };
    return NgOnDestroyWalker;
}(Lint.RuleWalker));
