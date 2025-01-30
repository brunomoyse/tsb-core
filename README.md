### Docker production ready

```bash
$ docker build -t tsb-core .
$ docker run --name tsb-core --env-file .env -p 3000:3000 tsb-core
```