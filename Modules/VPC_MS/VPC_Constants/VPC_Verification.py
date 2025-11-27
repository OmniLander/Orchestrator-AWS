import boto3
from botocore.exceptions import NoCredentialsError, ClientError

def vpc_in_existance():
    try:
        vpc_cleint = boto3.client('ec2')
        response = vpc_cleint.describe_vpcs()
        
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
        return {"success": False, "error": str(e)}
        
    except ClientError as e:
        print(f"There's been an error with the client side {e}")
        return {"success": False, "error": str(e)}

    
    except Exception as e:
        print(f"Unexpected error {e}")
        return {"success": False, "error": str(e)}

def subnets_in_existance():
    try:
        vpc_client = boto3.client('ec2')
        response = vpc_client.describe_subnets()
        subnets = {}

        for subnet in response['Subnets']:
            subnet_vpc = subnet['VpcId']
            subnet_id = subnet['SubnetId']
            subnet_zone = subnet['AvailabilityZone']
            subnet_state = subnet['State']
            subnet_cidr = subnet['CidrBlock']
            
            if 'Tags' in subnet:
                for tag in subnet['Tags']:
                     if tag['Key'] == 'Name':
                        subnet_name = tag.get('Value', 'N/A')
                        break
            
            if subnet_vpc not in subnets:
                subnets[subnet_vpc] = []

            subnets[subnet_vpc].append({
                "name" : subnet_name,
                "subnet_id" : subnet_id,
                "zone" : subnet_zone,
                "state" : subnet_state,
                "block" : subnet_cidr  
            })

        return subnets
    
    except NoCredentialsError as e:
        print(f"There's been an error with the credentials:{e}")
        return {"success": False, "error": str(e)}
        
    except ClientError as e:
        print(f"There's been an error with the client side {e}")
        return {"success": False, "error": str(e)}
    
    except Exception as e:
        print(f"Unexpected error {e}")
        return {"success": False, "error": str(e)}
