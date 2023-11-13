[![Review Assignment Due Date](https://classroom.github.com/assets/deadline-readme-button-24ddc0f5d75046c5622901739e7c5dd533143b0c8e959d652212380cedb1ea36.svg)](https://classroom.github.com/a/6BOvYMwN)

# PeerPrep

This is a [T3 Stack](https://create.t3.gg/) project bootstrapped with `create-t3-app`.

## Quickstart

Start Docker engine and initialize the `.env` file. Then:

If you want to use zipped existing data managed by git lfs

```bash
    brew install git-lfs #install git (use windows appropriate commands if not mac)
    git lfs install #init Git LFS in your git repository
    git lfs track "*.zip" #specify which files to be managed by Git LFS
    git lfs pull -I data.zip # git pull, specifying object's OID (ie retrieve binary data from Git LFS Object)
    # iinw you can also use git add and git commit (to the same OID of data.zip)
    unzip data.zip #
```

```bash
    mkdir data/{postgres,mongo,s3}  # (optional) ...or if you want to persist new data
    yarn
    yarn docker:up
    yarn prisma:push                # run this whenever you change the schema
    yarn prisma:studio              # (optional) open Prisma Studio to view/edit data
    yarn dev
```

Notes:

- If you want persistent data, create directories `./data/postgres` and `./data/mongo`.
- If you encounter authentication errors with `prisma:push` change the database ports or delete your local installations.
- If postgres is running on 5432, kill the process `sudo pkill -u postgres`
- If you have trouble starting the `judge0` container, or encounter `Incorrect type. Expected "include".` in `compose.yml`, try updating `docker-compose` to `v2.20` (Docker Desktop `4.42.1`) or later.

## Building and Running Image

```bash
    docker build -t peer-prep .
    docker compose --profile prod up -d
```

## Production Environment

For Assignment 4 and beyond, do note there is an additional `.env` file that needs to be initialized in the folder `production`. If you are a grader, please refer to the secret submission `Assignment4-production.env.txt`.
