# Prometheus-X Catalog API

The Prometheus-X Catalog API is a catalog management API that allows ecosystem administrators to manage their ecosystems, data/service providers to register their data & services, and enables users to browse the catalog. This API provides a platform for organizing and discovering various offerings within the Prometheus-X ecosystem.

## Prometheus-X Service Ecosystem

The Catalog API is one of the components allowing management of the catalog. Even though it is independant and serves its own purpose, users of a catalog will need interaction with more than one service. Thus, if you want to run a full catalog, consider looking into deploying the [Catalog Registry](https://github.com/Prometheus-X-association/catalog-registry) and the [Ecosystem Matcher](https://github.com/Prometheus-X-association/ecosystem-matcher), two components expanding on the catalog API to offer a more complete set of features.

In addition, the Prometheus-X Full specifications can be found on the [Prometheus-X docs repo/wiki](https://github.com/Prometheus-X-association/docs/wiki/Prometheus%E2%80%90X-Building-Blocks:-Enabling-Secure-Data-Ecosystems-and-Consent%E2%80%90driven-Data-Sharing)

## Table of Contents

- [Introduction](#prometheus-x-catalog-api)
- [Getting Started](#getting-started)
  - [Installation](#installation)
  - [Running the API](#running-the-api)
- [API Documentation](#api-documentation)
  - [Authentication](#authentication)
  - [Endpoints](#endpoints)
- [Contributing](#contributing)
- [License](#license)

## Getting Started

### Installation

1. Clone the repository:

```bash
git clone https://github.com/Prometheus-X-association/catalog-api.git
cd prometheus-x-catalog-api
```

2. Install the required dependencies:

```bash
npm install
```

3. Copy .env.sample to .env and setup your environment variables
```bash
cp .env.sample .env
# Setup your variables in .env
```

### Docker
1. Clone the repository from GitHub: `git clone https://github.com/Prometheus-X-association/catalog-api.git`
2. Navigate to the project directory: `cd catalog-api` and copy the .env.sample to .env `cp .env.sample .env`
3. Configure the application by setting up the necessary environment variables. You will need to specify database connection details and other relevant settings.
4. Create a docker network using `docker network create ptx`
5. Start the application: `docker-compose up -d`
6. If you need to rebuild the image `docker-compose build` and restart with: `docker-compose up -d`
7. If you don't want to use the mongodb container from the docker compose you can use the command `docker run -d -p your-port:your-port --name catalog-api catalog-api` after running `docker-compose build`


### Running the API

Start the development server:

```bash
npm run dev
```


By default, the API will be accessible at `http://localhost:3000`.

## API Documentation

### Authentication

The Prometheus-X Catalog API currently uses JWT (JSON Web Tokens) for authentication. To access certain endpoints, you need to include a valid JWT bearer token in the request header.

Authentication via a decentralized wallet is planned.

### Endpoints

For a complete list of all available endpoints, along with their request and response schemas, refer to the [JSON Swagger Specification](./docs/swagger.json) provided or visit the [github-pages](https://prometheus-x-association.github.io/catalog-api/) of this repository which displays the swagger specification with the Swagger UI.

## Contributing

We welcome contributions to the Prometheus-X Catalog API. If you find a bug or want to suggest a new feature, please open an issue in the GitHub repository. If you want to contribute code, please fork the repository, create a new branch, make your changes, and submit a pull request.

## License

The Prometheus-X Catalog API is open-source software licensed under the [MIT License](LICENSE).
