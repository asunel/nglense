# Generate a new angular project
ng new -test-project

# Install tslint
npm install typescript -g
npm install tslint -g

# Create tslint.json
cd test-project
tslint --init

# Install local tslint as well
npm install tslint --save-dev
 
#Compile lint rules ts files (--watch flag for development only)
npx tsc --lib es2015 ../ng-lense-rules/ngOnDestroyRule.ts --watch
npx tsc --lib es2015 ../ng-lense-rules/subscribeWithTakeUntilRule.ts --watch

Debug Tips:
============
# Whenever TS Lint Rule code is changed use Ctrl + Shift + P to reload VS Code window.

# Currently it is working when Deprecated TSLint VS Code extension is installed.

