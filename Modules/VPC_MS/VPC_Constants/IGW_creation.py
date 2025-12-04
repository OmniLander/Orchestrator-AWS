import boto3
from botocore.exceptions import NoCredentialsError, ClientError

def create_igw(igw_name):
    try:
        igw_client = boto3.client('ec2')
        response = igw_client.create_internet_gateway(
            TagSpecifications=[
                {
                    'ResourceType': 'internet-gateway',
                    'Tags': [
                        {
                            'Key': 'Name',
                            'Value': igw_name
                        },
                    ]
                },
            ]
        )

        igw = response['InternetGateway']['InternetGatewayId']
        return {"success": True, "data": igw}

    except NoCredentialsError as e:
        print(f"There's been an error with the credentials:{e}")
        return {"success": False, "error": str(e)}

    except ClientError as e:
        print(f"There's been an error with the client side {e}")
        return {"success": False, "error": str(e)}

    except Exception as e:
        print(f"Unexpected error {e}")
        return {"success": False, "error": str(e)}
    