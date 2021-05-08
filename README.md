# File-Server

This application is developed for sharing files between 2 different team.
We have 2 type of user in this application one has a role of QE ( Tester ) and anther has role of developer, A user with QE role can upload files and downloads but a user with developer access can only download files. In this application we only support `.xml` and `.gz` file you can add more type by changing the values in [\_\_init\_\_.py](https://github.com/vipin3699/File-Server/blob/master/src/__init__.py).

## Deployment Step
To deploy the app you can run this [script](https://github.com/vipin3699/File-Server/blob/master/deploy_on_host.sh) or if you want to deploy on container then use this [script](https://github.com/vipin3699/File-Server/blob/master/deploy_in_container.sh).

## Available URL
`/` or `/home`  This URL will show all the **directories** available in `result_base_dir_path` variable in [file](https://github.com/vipin3699/File-Server/blob/master/src/__init__.py).

`/about`    This URL will show you the about page currently It's just the application description and the Documentation.

`/account`  This URL will show you the information of specific User.

`/upload`   This URL will only visible to User with QE role and from here you can upload files. (Auth Required)

`/login`    This URL will take you to login page and ask you to enter _username_ and _password_.

`/register` This URL will help you in regestring a new User.

`/home/<path:>` This URL is a dynamic URL It based on the file and directories available in system. (Auth Required)

`/replace` This URL will use to replace a file which is already on the File Server. (Auth Required)

`/api/replace`   This API will Replace file on the File Server. (Auth Required)

## Available API
`/api`      This API will give similar output as `/home` but in JSON format.

`/api/download` This API will list all the files available for download on the basic of given parameters and can download any file for you. (Auth Required)

`/api/upload`   This API will upload file on the basic of given parameters. (Auth Required)

`/api/replace`   This API will Replace file on the File Server. (Auth Required)

### Available parameters for APIs


Products --> `It could be any string contains Product Names`

**Example product Product2**

Product Versions --> `It could be any string contain Product version like 01, 02 or any Values ..`

**Example version 7.13**

Sub Product Names -->  `It could be any string contain Sub Product Names`

**Example sub_prod Sub_Product1**

Category Name --> `It could be any string contain Category Names`

**Example Category category4**

Sub Category Names --> `It could be any string contains Sub Category Names`

**Example sub_category sub_category_3**

File Names --> This could be any name available on system which you want to upload or download.

**Example file file_name.[xml|gz]**

While downloading file you can pass file number also

**Example file 1**

file_to_replace --> For Replace API we use this option to give the name of the file we want to replace.

**Example file_to_replace file_name.[xml|gz]**

new_file --> This option is again used by replace api to pass the new file.

**Example new_file file_name.[xml|gz]**

file_number --> This option is optional for replace api. ( If you have more then one file on the File Server use this to pass the file number. )

**Example file_number 1**
