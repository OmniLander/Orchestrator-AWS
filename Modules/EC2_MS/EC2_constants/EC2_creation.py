import boto3
from botocore.exceptions import NoCredentialsError, ClientError

def create_ec2(image_id, instance_type, max_count, key_name, security_group_id, subnet_id, instance_name, user_data=None):
    try:
        ec2_client = boto3.client('ec2')
        response = ec2_client.run_instances(
            ImageId=image_id,  
            InstanceType=instance_type,
            MinCount=1,
            MaxCount=max_count,
            KeyName=key_name, 
            SecurityGroupIds=[security_group_id], 
            SubnetId=subnet_id,  
            UserData=user_data,

            BlockDeviceMappings=[
                {
                    'DeviceName': '/dev/xvda',  
                    'Ebs': {
                        'DeleteOnTermination': True,  
                        'VolumeSize': 25,  
                        'VolumeType': 'gp3'  
                    }
                }
            ],
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

        instance_id = response['Instances'][0]['InstanceId']
        
        return {
            "success": True, "data": {"message": "EC2 instance created successfully", "instance_id": instance_id, "instance_details": response['Instances'][0]}
        }
    
    except NoCredentialsError as e:
        print(f"There's been an error with the credentials: {e}")
        return {"success": False, "error": str(e)}
        
    except ClientError as e:
        print(f"There's been an error with the client side: {e}")
        return {"success": False, "error": str(e)}
    
    except Exception as e:
        print(f"Unexpected error: {e}")
        return {"success": False, "error": str(e)}