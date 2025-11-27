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
        return {"success": False, "error": str(e)}

    except ClientError as e:
        print(f"There's been an error with the client side {e}")
        return {"success": False, "error": str(e)}

    except Exception as e:
        print(f"Unexpected error {e}")
        return {"success": False, "error": str(e)}
    
def create_subnet(vpc_id, cidr_block, subnet_name):
    try:
        subnet_client = boto3.client('ec2')
        response = subnet_client.create_subnet(
            VpcId = vpc_id,
            CidrBlock = cidr_block,
            AvailabilityZone = 'us-east-1a',
            TagSpecifications=[
                {
                    'ResourceType': 'subnet',
                    'Tags': [
                        {
                            'Key': 'Name',
                            'Value': subnet_name
                        },
                    ]
                },
            ]
        )
        subnet_info = {
            "subnet_id" : response['Subnet']['SubnetId'],
            "subnet_state": response['Subnet']['State'] 
            }
        return subnet_info
    except NoCredentialsError as e:
        print(f"There's been an error with the credentials:{e}")
        return {"success": False, "error": str(e)}

    except ClientError as e:
        print(f"There's been an error with the client side {e}")
        return {"success": False, "error": str(e)}

    except Exception as e:
        print(f"Unexpected error {e}")
        return {"success": False, "error": str(e)}

