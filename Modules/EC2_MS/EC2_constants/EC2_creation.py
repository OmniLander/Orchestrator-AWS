import boto3
from botocore.exceptions import NoCredentialsError, ClientError

def create_ec2(image_id, instance_type, max_count, key_name, security_group_id, subnet_id, instance_name):
    try:
        ec2_client = boto3.client('ec2')
        response = ec2_client.run_instances(
            ImageId= image_id,  
            InstanceType = instance_type,
            MinCount= 1,
            MaxCount= max_count,
            KeyName= key_name, 
            SecurityGroupIds= [security_group_id,], 
            SubnetId= subnet_id,  
            TagSpecifications=[
                {
                    'ResourceType': 'instance',
                    'Tags': [
                        {
                            'Key': 'Name',
                            'Value': instance_name,
                        },
                    ],
                },
            ]
        )

        return f"success"
    
    except NoCredentialsError as e:
        print(f"There's been an error with the credentials:{e}")
        return {"success": False, "error": str(e)}
        
    except ClientError as e:
        print(f"There's been an error with the client side {e}")
        return {"success": False, "error": str(e)}
    
    except Exception as e:
        print(f"Unexpected error {e}")
        return {"success": False, "error": str(e)}
