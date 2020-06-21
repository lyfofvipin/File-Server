sudo yum install podman python3
sudo mkdir -p /home/resut_files/
sudo chmod 777 /home/resut_files/
sudo git clone https://github.com/vipin3699/File-Server.git; cd File-Server

#This command is to move DB to system dir so that if you delete the container the DB remain same
sudo echo -e "no" | mv src/site.db /home/resut_files/
sudo podman build --layers --force-rm --tag file-server .
sudo podman run -d -p 5000:5000 file-server

# Use this command if you want to attach a result directory to container
#sudo podman run -d -v file_path:/home/resut_files/:Z -p 5000:5000 file-server
