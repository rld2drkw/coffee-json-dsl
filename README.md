# coffee-json-dsl
A tiny framework to define DSL to generate JSON from coffee-script

## Overview
It's very annoying to write a valid JSON document, but many tools require configuration files in JSON format.
You know you can generate JSON from JavaScript object literals like shown below.

```js
var config = {
  key: 'value'
}

console.log(`${JSON.stringify(config,null,2)}`);
```

It displays a valid JSON string like:

```js
{
  "key": "value"
}
```

coffee-json-dsl is a tiny framework to define DSL to generate JSON format string.
You can write JSON document using coffee-script DSL.

## Install

```
npm install coffee-json-dsl
```

## Usage

1. require and create a new instance of coffee-json-dsl
1. declare plugins to use
1. add or load parts of document
1. generate JSON string and write it to a file

coffee-json-dsl merges all added or loaded parts into one JSON string.

The node.js code shown below generate AWS CloudFormation template JSON file.

```js
const fs = require('fs');
const CoffeeJsonDsl = require('coffee-json-dsl');
var coffeeJsonDsl = new CoffeeJsonDsl();

// setup plugins
coffeeJsonDsl.use({
  // defines the document root elements
  DOCUMENT: {
    AWSTemplateFormatVersion: "2010-09-09",
    Parameters: {},
    Resources: {},
    Conditions: {},
    Outputs: {},
    Mappings: {},
  },
  DSL: {
    join: function( /*separator,...parts*/ ) {
      var parts = Array.prototype.slice.call(arguments);
      var separator = parts.shift();

      return {
        'Fn::Join': [separator, parts]
      };
    },
    ref: function(logicalId) {
      return {
        Ref: logicalId
      };
    }
  }
});

// you can load a part of document from a file
coffeeJsonDsl.load(`${__dirname}/cfn/parameters.coffee`);

// and also you can add inline document part
coffeeJsonDsl.add(`
  Resources.MyBucket=
    Type: 'AWS::S3::Bucket'
    Properties:
      BucketName: $.join('-', $.ref('Env'), 'Bucket')

  Outputs.MyBucketName=
    Value: $.ref('MyBucket')
`);

// generate JSON format string and write it to a file.
fs.writeFileSync(`${__dirname}/my_stack.template`, coffeeJsonDsl.generate());
```

## Plugins
Actually use() specifies plugins to use. It accepts npm module name prefixed by
'coffee-json-dsl-' and its options object, or an object literal.
Plugin module is a function that takes options object as the argument and return
an object literal to define DOCUMENT, DSL and HOOK properties.

DOCUMENT declares the top level properties of generated JSON. You have to use
at least one plugin to declare DOCUMENT. In each part of document, you can only
modify the properties declared in DOCUMENT. You cannot introduce any new propertiy
which is not declared in any plugins.

DSL defines commands available as function properties of $ object in each part of
document. HOOK defines some events to hook: 'init', 'beforeEach', 'afterEach' and
'finish'. 'init' and 'finish' takes a whole document object as the argument.
'beforeEach' and 'afterEach' takes a current part of document object as the argument.

DSL and HOOK functions share a same 'this' context. So you can write, for example,
a command to generate a set of elements.

```js
const Resources = Symbol();

module.exports = function(/*pluginOptions*/) {
  return {
    DOCUMENT: {
      Resources: {}
    },
    DSL: {
      // add AWS::Lambda::Function and its AWS::IAM::Role resources at a time
      lambda: function(name,options){
        let resources = this[Resources];

        resources[`Function${name}`]= {
          Type: 'AWS::Lambda::Function',
          Properties: {
            FunctionName: name,
            Runtime: 'nodejs4.3',
            Code: {
              S3Bucket: options.bucket || this.ref('LambdaBucket'),
              S3Key: `${options.prefix || 'lambdas'}/${name}.zip`,
            },
            Handler: 'index.handler',
            Runtime: 'nodejs4.3',
            Timeout: options.Timeout || 10,
            Role: this.getAtt(`Role${name}`, 'Arn'),
            FunctionName: this.join('-', this.ref('Environment'), name),
          },
        };

        resources[`Role${name}`]={
          Type: 'AWS::IAM::Role',
          Properties:{
            AssumeRolePolicyDocument:  {
              Version : '2012-10-17',
              'Statement': [
                {
                  Effect: 'Allow',
                  Principal: {
                    Service: 'lambda.amazonaws.com',
                  },
                  Action: 'sts:AssumeRole',
                }
              ],
            },
            Path: '/',
            Policies: [
              {
                PolicyDocument: {
                  Version: '2012-10-17',
                  Statement: [
                    {
                      Resource: '*',
                      Action: [
                        'logs:CreateLogGroup',
                        'logs:CreateLogStream',
                        'logs:PutLogEvents'
                      ],
                      Effect: 'Allow'
                    }
                  ].concat(options.PolicyStatements)
                },
                PolicyName: this.join('-',this.ref('Environment'), `Role${name}Policy`)
              }
            ]
          },
        };
      }
    },
    HOOK: {
      beforeEach: function(part){
        this[Resources] = part.Resources;
      },
    }
  };
};
```

It is recommended using Symbol as a property identifier to avoid conflicts with other plugins.
This plugin generates AWS::Lambda::Function and its AWS::IAM::Role in a command like:

input coffee template

```coffee
Parameters.Environtment=
  Type: 'String'
  Description: 'environment name'
  Default: 'dev'

Parameters.LambdaBucket=
  Type: 'String'
  Description: 'the name of bucket to store lambda function packages'
  Default: 'my-lambda-function-bucket'

$.lambda('Count', {
  PolicyStatements: [
    Resource: '*'
    Action: [
      's3:*'
    ]
    Effect: 'Allow'
  ],
  Timeout: 30
});

```

generated JSON

```json
{
  "AWSTemplateFormatVersion": "2010-09-09",
  "Parameters": {
    "Environtment": {
      "Type": "String",
      "Description": "environment name",
      "Default": "dev"
    },
    "LambdaBucket": {
      "Type": "String",
      "Description": "the name of bucket to store lambda function packages",
      "Default": "my-lambda-function-bucket"
    }
  },
  "Resources": {
    "FunctionCount": {
      "Type": "AWS::Lambda::Function",
      "Properties": {
        "FunctionName": {
          "Fn::Join": [
            "-",
            [
              {
                "Ref": "Environment"
              },
              "Count"
            ]
          ]
        },
        "Runtime": "nodejs4.3",
        "Code": {
          "S3Bucket": {
            "Ref": "LambdaBucket"
          },
          "S3Key": "lambdas/Count.zip"
        },
        "Handler": "index.handler",
        "Timeout": 30,
        "Role": {
          "Fn::GetAtt": [
            "RoleCount",
            "Arn"
          ]
        }
      }
    },
    "RoleCount": {
      "Type": "AWS::IAM::Role",
      "Properties": {
        "AssumeRolePolicyDocument": {
          "Version": "2012-10-17",
          "Statement": [
            {
              "Effect": "Allow",
              "Principal": {
                "Service": "lambda.amazonaws.com"
              },
              "Action": "sts:AssumeRole"
            }
          ]
        },
        "Path": "/",
        "Policies": [
          {
            "PolicyDocument": {
              "Version": "2012-10-17",
              "Statement": [
                {
                  "Resource": "*",
                  "Action": [
                    "logs:CreateLogGroup",
                    "logs:CreateLogStream",
                    "logs:PutLogEvents"
                  ],
                  "Effect": "Allow"
                },
                {
                  "Resource": "*",
                  "Action": [
                    "s3:*"
                  ],
                  "Effect": "Allow"
                }
              ]
            },
            "PolicyName": {
              "Fn::Join": [
                "-",
                [
                  {
                    "Ref": "Environment"
                  },
                  "RoleCountPolicy"
                ]
              ]
            }
          }
        ]
      }
    }
  },
  "Conditions": {},
  "Outputs": {},
  "Mappings": {}
}
```

Currently, I am working on AWS CloudFormation which requires a huge JSON document.
I am developing a plugin to write CloudFormation template([coffee-json-dsl-cfn](https://github.com/rld2drkw/coffee-json-dsl-cfn/))
