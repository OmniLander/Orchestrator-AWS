import boto3
from botocore.exceptions import NoCredentialsError, ClientError

def vpc_in_existance():
    try:
        vpc_resource = boto3.client('ec2')
        response = vpc_resource.describe_vpcs()
        
        vpcs = {}

        for vpc in response['Vpcs']:
            vpc_id = vpc['VpcId']
            cidr_block = vpc['CidrBlock']
            
            # get tags name
            vpc_name = "No name"
            if 'Tags' in vpc:
                for tag in vpc['Tags']:
                    if tag['Key'] == 'Name':
                        vpc_name = tag['Value']
                        break
            
            vpcs[vpc_id] = {
                'name': vpc_name,
                'cidr_block': cidr_block,
                'state': vpc['State']
            }
        
        return vpcs   
    
    except NoCredentialsError as e:
        print(f"There's been an error with the credentials:{e}")
        return None
        
    except ClientError as e:
        print(f"There's been an error with the client side {e}")
        return None
    
    except Exception as e:
        print(f"Unexpected error {e}")
        return None

print(vpc_in_existance())