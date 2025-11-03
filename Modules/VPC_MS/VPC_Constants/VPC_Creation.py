import boto3
from botocore.exceptions import NoCredentialsError, ClientError

def create_vpc(vpc_name, block):
    try:
        vpc_client = boto3.client('ec2')
        response = vpc_client.create_vpc(
            CidrBlock = block,
            TagSpecifications=[
                {
                'ResourceType': 'vpc',
                'Tags': [
                    {
                        'Key': 'Name',
                        'Value': vpc_name
                    }
                ]
                }
            ]
        )

        vpc_info = {
            'VpcId': response['Vpc']['VpcId'],
            'State': response['Vpc']['State'],
            'CidrBlock': response['Vpc']['CidrBlock']
        }

        return vpc_info
    
    except NoCredentialsError as e:
        print(f"There's been an error with the credentials:{e}")
        return None

    except ClientError as e:
        print(f"There's been an error with the client side {e}")
        return None

    except Exception as e:
        print(f"Unexpected error {e}")
        return None
    