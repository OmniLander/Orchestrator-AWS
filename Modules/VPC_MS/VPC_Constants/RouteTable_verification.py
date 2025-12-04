import boto3
from botocore.exceptions import NoCredentialsError, ClientError

def route_table_in_existence():
    try:
        ec2 = boto3.client('ec2')
        response = ec2.describe_route_tables()

        rts = []

        for rt in response["RouteTables"]:
            rt_id = rt.get("RouteTableId")
            vpc_id = rt.get("VpcId")

            # Procesar asociaciones (main o subnet)
            associations = rt.get("Associations", [])
            subnet_list = []
            is_main = False

            for a in associations:
                # Main puede venir como string o bool
                main_flag = a.get("Main")
                is_main = bool(main_flag) or a.get("Main") == "true"

                subnet_id = a.get("SubnetId")
                if subnet_id:
                    subnet_list.append(subnet_id)

            # Procesar Tags
            tags = {t["Key"]: t["Value"] for t in rt.get("Tags", [])}

            # Procesar rutas
            routes = []
            for r in rt.get("Routes", []):
                routes.append({
                    "destination": r.get("DestinationCidrBlock") or r.get("DestinationPrefixListId"),
                    "target": r.get("GatewayId")
                        or r.get("TransitGatewayId")
                        or r.get("NatGatewayId")
                        or r.get("VpcPeeringConnectionId")
                        or "local"
                })

            rts.append({
                "route_table_id": rt_id,
                "vpc_id": vpc_id,
                "is_main": is_main,
                "associated_subnets": subnet_list,
                "tags": tags,
                "routes": routes
            })

        return {"success": True, "data": rts}

    except NoCredentialsError as e:
        print(f"There's been an error with the credentials: {e}")
        return {"success": False, "error": str(e)}

    except ClientError as e:
        print(f"There's been an error with the client side {e}")
        return {"success": False, "error": str(e)}

    except Exception as e:
        print(f"Unexpected error {e}")
        return {"success": False, "error": str(e)}
