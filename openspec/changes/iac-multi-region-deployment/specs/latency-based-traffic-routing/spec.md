## ADDED Requirements

### Requirement: Front Door latency-based routing to nearest region

The infrastructure SHALL provision an Azure Front Door profile with a single public endpoint and a single origin group that fronts all enabled regional Container Apps. Front Door SHALL route each incoming request to the lowest-latency healthy regional origin (latency-based routing), so clients are served from the datacenter nearest them.

#### Scenario: Client served from nearest healthy region

- **WHEN** a client in Europe and a client in Australia each request the Front Door endpoint, with both regions enabled and healthy
- **THEN** the European client is routed to the West Europe origin and the Australian client to the Australia Central origin, based on lowest latency

#### Scenario: Origins track the enabled region list

- **WHEN** the enabled region list changes and the deployment is re-run
- **THEN** the Front Door origin group contains exactly one origin per enabled region and none for disabled regions

### Requirement: Health-probe-based failover

Front Door SHALL health-probe each origin on the `GET /health` endpoint and route traffic only to origins reporting healthy, failing over to the next-lowest-latency healthy origin when one becomes unhealthy.

#### Scenario: Unhealthy origin removed from rotation

- **WHEN** the West US origin fails its `/health` probe
- **THEN** Front Door stops routing traffic to West US and serves affected clients from the next-nearest healthy region

#### Scenario: Single healthy origin still serves

- **WHEN** only one region is enabled and healthy
- **THEN** all client traffic is routed to that single origin
