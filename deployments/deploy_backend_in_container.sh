sudo yum install podman
sudo mkdir -p /home/dir_to_share/
sudo chmod 777 /home/dir_to_share/
sudo git clone https://github.com/lyfofvipin/File-Server.git; cd File-Server/backend
sudo podman build --layers --force-rm --tag file-server-backend .
sudo podman run -d -p 5000:5000 file-server-backend

# Use this command if you want to attach a result directory to container
#sudo podman run -d -v system_file_path:/home/dir_to_share/:Z -p 5000:5000 file-server-backend
