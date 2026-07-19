import yaml

with open('backend/infra/docker-compose.yml', 'r') as f:
    compose = yaml.safe_load(f)

services = compose.get('services', {})
for name, svc in services.items():
    if name.endswith('-service') or name == 'websocket-hub':
        port = svc.get('environment', {}).get('PORT', '3000')
        svc['healthcheck'] = {
            'test': ['CMD', 'wget', '-qO-', f'http://localhost:{port}/health/ready'],
            'interval': '10s',
            'timeout': '5s',
            'retries': 3,
            'start_period': '10s'
        }
        svc['deploy'] = {
            'update_config': {
                'order': 'start-first',
                'failure_action': 'rollback',
                'delay': '10s'
            },
            'rollback_config': {
                'order': 'start-first'
            }
        }

with open('backend/infra/docker-compose.yml', 'w') as f:
    yaml.dump(compose, f, sort_keys=False)

