import boto3
from botocore.exceptions import NoCredentialsError, ClientError

def igw_in_existence():
    try:
        igw_client = boto3.client('ec2')
        response = igw_client.describe_internet_gateways()
        igws = {}
        for igw in response['InternetGateways']:
            igw_id = igw['InternetGatewayId']
            
            igw_state = "detached"
            igw_vpc = "N/A"
            if len(igw['Attachments']) != 0:
                for attach in igw['Attachments']:
                    igw_state = attach['State']
                    igw_vpc = attach['VpcId']
                    break
            
            igw_name = 'N/A'
            if len(igw['Tags']) != 0:
                for tag in igw['Tags']:
                    igw_name = tag['Value']
                    break

            igws[igw_id] = {
                'name' : igw_name,
                'state' : igw_state,
                'igw_vpc' : igw_vpc
            }

        return {"success": True, "data": igws}
    
    except NoCredentialsError as e:
        print(f"There's been an error with the credentials:{e}")
        return {"success": False, "error": str(e)}
        
    except ClientError as e:
        print(f"There's been an error with the client side {e}")
        return {"success": False, "error": str(e)}

    
    except Exception as e:
        print(f"Unexpected error {e}")
        return {"success": False, "error": str(e)}

