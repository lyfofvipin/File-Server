# File-Server

This application is developed for sharing files between 2 different team.
We have 2 type of user in this application one has a role of QE ( Tester ) and anther has role of developer, A user with QE role can upload files and downloads but a user with developer can only download files. In this application we only support `.xml` and `.gz` file.

## Deployment Step
To deploy the app you can run this [script](https://github.com/vipin3699/File-Server/blob/master/deploy_os_host.sh) or if you want to deploy on container then use this [script](https://github.com/vipin3699/File-Server/blob/master/deploy_in_container.sh).

## Available URL
`/` or `/home`  This URL will show all the **directories** available in `result_base_dir_path` variable in [file](https://github.com/vipin3699/File-Server/blob/master/src/__init__.py).

`/about`    This URL will show you the about page currently It's just the application description.

`/account`  This URL will show you the information of specific User.

`/upload`   This URL will only visible to User with QE role and from here you can upload files.

`/login`    This URL will take you to login page and ask you to enter _username_ and _password_.

`/register` This URL will help you in regestring a new User.

`/home/<path:>` This URL is a dynamic URL It based on the file and directories available in system.

## Available API
`/api`      This API will give similar output as `/home` but in JSON format.

`/api/download` This API will list all the files available for download on the basic of given parameters. (Auth Required)

`/api/upload`   This API will upload file on the basic of given parameters. (Auth Required)