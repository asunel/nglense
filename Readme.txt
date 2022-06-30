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
 
#Compile lint rules ts files
npx tsc --lib es2015 ../ng-lense-rules/ngOnDestroyRule.ts
npx tsc --lib es2015 ../ng-lense-rules/subscribeWithTakeUntilRule.ts 

