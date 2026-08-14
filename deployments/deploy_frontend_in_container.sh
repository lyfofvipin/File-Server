sudo yum install podman
sudo mkdir -p /home/dir_to_share/
sudo chmod 777 /home/dir_to_share/
sudo git clone https://github.com/lyfofvipin/File-Server.git; cd File-Server/frontend
sudo podman build --layers --force-rm --tag file-server-frontend .
sudo podman run -d -p 5000:5000 file-server-frontend

