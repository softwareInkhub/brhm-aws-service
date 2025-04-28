import { NextResponse } from 'next/server';

// Define workflow templates that match AWS Step Functions patterns
export const workflowTemplates = [
  {
    name: 'distributed-map-s3',
    description: 'Use Distributed Map to process files in S3. Each file will be processed by a Lambda function.',
    type: 'STANDARD',
    category: 'Data processing',
    services: ['Lambda', 'S3'],
    documentationUrl: 'https://docs.aws.amazon.com/step-functions/latest/dg/distributed-map-sample.html',
    definition: JSON.stringify({
      Comment: 'Process S3 files using Distributed Map',
      StartAt: "List S3",
      States: {
        "List S3": {
          Type: "Task",
          Resource: "arn:aws:states:::aws-sdk:s3:listObjectsV2",
          Parameters: {
            "Bucket": "your-bucket-name",
            "Prefix": "your-prefix/"
          },
          Next: "Process Files"
        },
        "Process Files": {
          Type: "Map",
          MaxConcurrency: 10,
          ItemProcessor: {
            ProcessorConfig: {
              Mode: "DISTRIBUTED",
              ExecutionType: "STANDARD"
            },
            StartAt: "Process File",
            States: {
              "Process File": {
                Type: "Task",
                Resource: "arn:aws:states:::lambda:invoke",
                Parameters: {
                  "FunctionName": "YourLambdaFunction",
                  "Payload": {
                    "bucket": "your-bucket-name",
                    "key.$": "$.Key"
                  }
                },
                End: true
              }
            }
          },
          ItemsPath: "$.Contents",
          End: true
        }
      }
    })
  },
  {
    name: 'distributed-map-csv',
    description: 'Use Distributed Map to iterate over the rows of a generated CSV file in S3. Each row has order and shipping information.',
    type: 'STANDARD',
    category: 'Data processing',
    services: ['Lambda', 'S3', 'SQS'],
    documentationUrl: 'https://docs.aws.amazon.com/step-functions/latest/dg/distributed-map-sample.html',
    definition: JSON.stringify({
      Comment: 'Process CSV files using Distributed Map',
      StartAt: 'DynamoDBScan',
      States: {
        "DynamoDBScan": {
          Type: "Task",
          Resource: "arn:aws:states:::aws-sdk:dynamodb:scan",
          Parameters: {
            "TableName": "InputTable"
          },
          Next: "Distributed Map"
        },
        "Distributed Map": {
          Type: "Map",
          ItemProcessor: {
            ProcessorConfig: {
              Mode: "DISTRIBUTED",
              ExecutionType: "STANDARD"
            },
            StartAt: "Process Item",
            States: {
              "Process Item": {
                Type: "Task",
                Resource: "arn:aws:states:::lambda:invoke",
                Parameters: {
                  "FunctionName": "ProcessCSVRow",
                  "Payload": {
                    "item.$": "$"
                  }
                },
                End: true
              }
            }
          },
          End: true,
          MaxConcurrency: 1000,
          ItemReader: {
            Resource: "arn:aws:states:::s3:getObject",
            Parameters: {
              "Bucket": "InputBucket",
              "Key": "csvfile.csv"
            },
            ReaderConfig: {
              "InputType": "CSV",
              "CSVHeaderLocation": "FIRST_ROW"
            }
          },
          ItemBatcher: {
            MaxItemsPerBatch: 100
          }
        }
      }
    })
  },
  {
    name: 'distributed-map-noaa',
    description: 'Use Distributed Map to copy NOAA weather data in S3. Then another distributed map state will process those S3 files.',
    type: 'STANDARD',
    category: 'Data processing',
    services: ['Lambda', 'S3', 'CloudWatch'],
    documentationUrl: 'https://docs.aws.amazon.com/step-functions/latest/dg/distributed-map-sample.html',
    definition: JSON.stringify({
      Comment: 'Process NOAA weather data using Distributed Map',
      StartAt: "List S3",
      States: {
        "List S3": {
          Type: "Task",
          Resource: "arn:aws:states:::aws-sdk:s3:listObjectsV2",
          Parameters: {
            "Bucket": "noaa-weather-data",
            "Prefix": "/"
          },
          Next: "Process Files"
        },
        "Process Files": {
          Type: "Map",
          ItemProcessor: {
            ProcessorConfig: {
              Mode: "DISTRIBUTED",
              ExecutionType: "STANDARD"
            },
            StartAt: "Copy File",
            States: {
              "Copy File": {
                Type: "Task",
                Resource: "arn:aws:states:::lambda:invoke",
                Parameters: {
                  "FunctionName": "ProcessNOAAData",
                  "Payload": {
                    "bucket": "noaa-weather-data",
                    "key.$": "$.Key"
                  }
                },
                End: true
              }
            }
          },
          ItemsPath: "$.Contents",
          End: true,
          MaxConcurrency: 100
        }
      }
    })
  },
  {
    name: 'stripe-invoice-generation',
    description: 'Use Lambda functions to call Stripe APIs for an invoice-generation workflow. Retrieves a list of customers, summarizes their payment methods, and either generates invoices or reports missing/expired credit cards.',
    type: 'STANDARD',
    category: 'E-Commerce',
    services: ['Lambda', 'SNS'],
    documentationUrl: 'https://docs.aws.amazon.com/step-functions/latest/dg/connect-to-resource.html',
    definition: JSON.stringify({
      Comment: 'Generate invoices using Stripe API',
      StartAt: "List Customers",
      States: {
        "List Customers": {
          Type: "Task",
          Resource: "arn:aws:states:::lambda:invoke",
          Parameters: {
            "FunctionName": "StripeListCustomers",
            "Payload": {
              "action": "list_customers"
            }
          },
          Next: "Process Customers"
        },
        "Process Customers": {
          Type: "Map",
          ItemsPath: "$.Payload.customers",
          Iterator: {
            StartAt: "Check Payment Method",
            States: {
              "Check Payment Method": {
                Type: "Choice",
                Choices: [
                  {
                    Variable: "$.payment_method",
                    IsPresent: true,
                    Next: "Generate Invoice"
                  }
                ],
                Default: "Report Missing Payment"
              },
              "Generate Invoice": {
                Type: "Task",
                Resource: "arn:aws:states:::lambda:invoke",
                Parameters: {
                  "FunctionName": "StripeGenerateInvoice",
                  "Payload": {
                    "customer_id.$": "$.id",
                    "auto_advance": true
                  }
                },
                End: true
              },
              "Report Missing Payment": {
                Type: "Task",
                Resource: "arn:aws:states:::sns:publish",
                Parameters: {
                  "TopicArn": "YOUR_SNS_TOPIC_ARN",
                  "Message": {
                    "customer_id.$": "$.id",
                    "status": "missing_payment_method"
                  }
                },
                End: true
              }
            }
          },
          End: true
        }
      }
    })
  },
  {
    name: 'ai-prompt-chaining',
    description: 'Use AI prompt-chaining with Amazon Bedrock to build high-quality chatbots. By chaining prompts, the LLM can use conversation history to provide more relevant responses.',
    type: 'STANDARD',
    category: 'Machine learning',
    services: ['Bedrock', 'AI/ML'],
    documentationUrl: 'https://docs.aws.amazon.com/bedrock/latest/userguide/step-functions.html',
    definition: JSON.stringify({
      Comment: 'AI prompt chaining with Bedrock',
      StartAt: "Process Initial Prompt",
      States: {
        "Process Initial Prompt": {
          Type: "Task",
          Resource: "arn:aws:states:::bedrock:invokeModel",
          Parameters: {
            ModelId: "anthropic.claude-v2",
            ContentType: "application/json",
            Body: {
              "prompt": "$.input.prompt",
              "max_tokens": 500
            }
          },
          Next: "Chain Prompt"
        },
        "Chain Prompt": {
          Type: "Task",
          Resource: "arn:aws:states:::bedrock:invokeModel",
          Parameters: {
            ModelId: "anthropic.claude-v2",
            ContentType: "application/json",
            Body: {
              "prompt": "$.previous_response",
              "max_tokens": 500
            }
          },
          End: true
        }
      }
    })
  },
  {
    name: 'etl-redshift',
    description: 'This sample project demonstrates how to use Step Functions and the Amazon Redshift Data API to run an ETL/ELT workflow that loads data into the Amazon Redshift data warehouse.',
    type: 'STANDARD',
    category: 'Data processing',
    services: ['Redshift', 'ETL', 'Lambda'],
    documentationUrl: 'https://docs.aws.amazon.com/step-functions/latest/dg/sample-etl-orchestration.html',
    definition: JSON.stringify({
      Comment: 'ETL workflow with Redshift',
      StartAt: "Extract",
      States: {
        "Extract": {
          Type: "Task",
          Resource: "arn:aws:states:::lambda:invoke",
          Next: "Transform"
        },
        "Transform": {
          Type: "Task",
          Resource: "arn:aws:states:::lambda:invoke",
          Next: "Load"
        },
        "Load": {
          Type: "Task",
          Resource: "arn:aws:states:::redshift-data:executeStatement",
          Parameters: {
            ClusterIdentifier: "redshift-cluster-1",
            Database: "dev",
            Sql: "COPY table FROM 's3://bucket/transformed_data'"
          },
          End: true
        }
      }
    })
  }
];

export async function GET() {
  try {
    return NextResponse.json({
      templates: workflowTemplates,
      message: 'Templates fetched successfully'
    });
  } catch (error) {
    console.error('Error fetching templates:', error);
    return NextResponse.json(
      { error: 'Failed to fetch templates' },
      { status: 500 }
    );
  }
} 