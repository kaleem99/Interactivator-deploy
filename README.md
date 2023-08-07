# LT Interactivator

### Local Development
This repo has a container for development. To access the development container, make sure that you meet the following requirements.

- Make sure you have docker for desktop installed and running and VSCode installed. 

- Before startng VSCode, go inside the repo and rename  "/.devcontainer/example.env" to "/.devcontainer/.env".

- When opening vscode, you should be prompted (bottom right hand corner) to set install devcontainer, if you havent't installed it yet.

- You should get another prompt, that says "Folder contains a Dev Container configuration file. Reopen folder to develop in a container". Click on "Reopen in container".

- VScode should reopen inside the dev container.

- To get the actual flask application running, run the following in the terminal "python3 app.py".

- When running the above command, the application should be available, you can navigate to "http://localhost:8080/health" to confirm.
