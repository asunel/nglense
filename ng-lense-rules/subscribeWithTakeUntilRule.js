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
var ts = require("../test-project/node_modules/typescript/lib/typescript");
var Rule = /** @class */ (function (_super) {
    __extends(Rule, _super);
    function Rule() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    Rule.prototype.apply = function (sourceFile) {
        return this.applyWithWalker(new NgOnDestroyWalker(sourceFile, this.getOptions()));
    };
    Rule.metadata = {
        ruleName: 'subscribe-with-takeUntil',
        description: 'Enforces use of takeUntil operator for rxjs subscriptions',
        optionsDescription: 'Not configurable.',
        options: null,
        type: 'maintainability',
        typescriptOnly: false
    };
    Rule.FAILURE_STRING = 'Subscriptions must have takeUntil to avoid memory leak';
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
        var _a, _b, _c, _d, _e, _f;
        var classMethods = node.members.filter(ts.isMethodDeclaration);
        var classProperties = node.members.filter(ts.isPropertyDeclaration);
        var subscribeStatements = [];
        if (classMethods === null || classMethods === void 0 ? void 0 : classMethods.length) {
            for (var _i = 0, classMethods_1 = classMethods; _i < classMethods_1.length; _i++) {
                var method = classMethods_1[_i];
                var subscribeStatement = (_b = (_a = method === null || method === void 0 ? void 0 : method.body) === null || _a === void 0 ? void 0 : _a.statements) === null || _b === void 0 ? void 0 : _b.filter(function (statement) { return statement.getText().match(/\.subscribe\(/); });
                if (subscribeStatement && (subscribeStatement === null || subscribeStatement === void 0 ? void 0 : subscribeStatement.length) > 0) {
                    subscribeStatements.push.apply(subscribeStatements, subscribeStatement);
                }
            }
            if (subscribeStatements.length > 0) {
                for (var _g = 0, subscribeStatements_1 = subscribeStatements; _g < subscribeStatements_1.length; _g++) {
                    var statement = subscribeStatements_1[_g];
                    var statementText = statement.getText();
                    if (statementText.match(/takeUntil\(/g)) {
                        // TODO: ;
                    }
                    else {
                        var fix = [];
                        var pipeExpression = (_d = (_c = statement['expression']) === null || _c === void 0 ? void 0 : _c.expression) === null || _d === void 0 ? void 0 : _d.expression; // TODO: correct
                        if (pipeExpression) {
                            var addTakeUntilArgument = new Lint.Replacement(pipeExpression.end - 1, 0, (((_e = pipeExpression === null || pipeExpression === void 0 ? void 0 : pipeExpression.arguments) === null || _e === void 0 ? void 0 : _e.length) ? ', ' : '') + "takeUntil(this.componentDestroyed$)");
                            fix.push(addTakeUntilArgument);
                        }
                        if ((classProperties === null || classProperties === void 0 ? void 0 : classProperties.filter(function (property) { return property.getText().match(/componentDestroyed/g); }).length) === 0) {
                            var privateProperty = new Lint.Replacement(classProperties[classProperties.length - 1].end, 0, '\n\n  private componentDestroyed$ = new Subject();');
                            fix.push(privateProperty);
                        }
                        var ngOnDestroyMethod = classMethods.find(function (method) { return method.getText().match(/ngOnDestroy/g); });
                        var bodyStartPostion = (_f = ngOnDestroyMethod === null || ngOnDestroyMethod === void 0 ? void 0 : ngOnDestroyMethod.body) === null || _f === void 0 ? void 0 : _f.getStart();
                        if (bodyStartPostion) {
                            var nextCompleteSubjectFix = new Lint.Replacement(bodyStartPostion + 1, 0, '\n    this.componentDestroyed$.next();\n    this.componentDestroyed$.complete();\n  ');
                            fix.push(nextCompleteSubjectFix);
                        }
                        this.addFailureAtNode(statement, Rule.FAILURE_STRING, fix);
                    }
                }
            }
        }
    };
    return NgOnDestroyWalker;
}(Lint.RuleWalker));
