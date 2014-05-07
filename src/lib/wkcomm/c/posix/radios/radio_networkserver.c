#include <sys/socket.h>
#include <netinet/in.h>
#include <arpa/inet.h>
#include <stdio.h>
#include <stdlib.h>
#include <unistd.h>
#include <errno.h>
#include <string.h>
#include <time.h>
#include "core.h"
#include "hooks.h"
#include "types.h"
#include "config.h"
#include "debug.h"
#include "routing/routing.h"
#include "radio_networkserver.h"
#include "posix_utils.h"

// Here we have a circular dependency between radio_X and routing.
// Bit of a code smell, but since the two are supposed to be used together I'm leaving it like this for now.
// (routing requires at least 1 radio_ library to be linked in)
#include "../../common/routing/routing.h"

#ifdef RADIO_USE_NETWORKSERVER

// Protocol format: see WuKongNetworkServer.java
#define MODE_MESSAGE 1
#define MODE_DISCOVERY 2

int radio_networkserver_sockfd;
struct sockaddr_in radio_networkserver_servaddr;
uint8_t radio_networkserver_receive_buffer[WKCOMM_MESSAGE_PAYLOAD_SIZE+3]; // 3 for wkcomm overhead
dj_hook radio_networkserver_shutdownHook;

void open_connection() {
	struct sockaddr_in radio_networkserver_servaddr;

	radio_networkserver_sockfd=socket(AF_INET,SOCK_STREAM,0);

	memset(&radio_networkserver_servaddr, 0, sizeof(radio_networkserver_servaddr));
	radio_networkserver_servaddr.sin_family = AF_INET;
	radio_networkserver_servaddr.sin_addr.s_addr=inet_addr(posix_network_server_address);
	radio_networkserver_servaddr.sin_port=htons(posix_network_server_port);

	int retval = connect(radio_networkserver_sockfd, (struct sockaddr *)&radio_networkserver_servaddr, sizeof(radio_networkserver_servaddr));

	if (retval != 0) {
		fprintf(stderr, "Unable to establish local radio connection: %d\n", errno);
	}
	int length=recv(radio_networkserver_sockfd, radio_networkserver_receive_buffer, 1, 0);
	if (length != 1 || radio_networkserver_receive_buffer[0] != 42) {
		fprintf(stderr, "Unable to establish local radio connection.\n");
	}
	uint8_t send_buffer[5];
	// Connect in messaging mode
	send_buffer[0] = MODE_MESSAGE;
	// Tell the server our network id
	send_buffer[1] = radio_networkserver_get_node_id() & 0xFF;
	send_buffer[2] = (radio_networkserver_get_node_id() >> 8) & 0xFF;
	send_buffer[3] = (radio_networkserver_get_node_id() >> 16) & 0xFF;
	send_buffer[4] = (radio_networkserver_get_node_id() >> 24) & 0xFF;
    retval = write(radio_networkserver_sockfd, send_buffer, 5);
	if (retval == -1) {
		fprintf(stderr, "Unable to send local network id to server: %d\n", errno);
		exit(1);
	}
}

void radio_networkserver_shotdown(void *data) {
	close(radio_networkserver_sockfd);
}

void radio_networkserver_init(void) {
	open_connection();
	radio_networkserver_shutdownHook.function = radio_networkserver_shotdown;
	dj_hook_add(&dj_core_shutdownHook, &radio_networkserver_shutdownHook);
}

radio_networkserver_address_t radio_networkserver_get_node_id() {
	return posix_local_network_id;
}

void radio_networkserver_poll(void) {
	// TMP CODE TO PREVENT THE BUSY LOOP FROM GOING TO 100% CPU LOAD
	// THIS IS OBVIOUSLY NOT THE BEST WAY TO DO IT...
	struct timespec tim, tim2;
	tim.tv_sec = 0;
	tim.tv_nsec = 1000000L; // 1 millisecond
	nanosleep(&tim , &tim2);
	// END TMP CODE

	uint8_t length;
	if (recv(radio_networkserver_sockfd, &length, 1, MSG_DONTWAIT) > 0) {
		if (length == 0) {
			// Just a heartbeat.
			return;
		}
		recv(radio_networkserver_sockfd, radio_networkserver_receive_buffer, 4, 0);
		radio_networkserver_address_t src = ((uint32_t)radio_networkserver_receive_buffer[0])
										 + (((uint32_t)radio_networkserver_receive_buffer[1]) << 8)
										 + (((uint32_t)radio_networkserver_receive_buffer[2]) << 16)
										 + (((uint32_t)radio_networkserver_receive_buffer[3]) << 24);
		recv(radio_networkserver_sockfd, radio_networkserver_receive_buffer, 4, 0); // skip dest
		recv(radio_networkserver_sockfd, radio_networkserver_receive_buffer, length-9, 0); // -9: 1 length, 4 src, 4 dest
		DEBUG_LOG(DBG_WKCOMM, "message received from %d, length %d\n", src, length-9);
		routing_handle_local_message(src, radio_networkserver_receive_buffer, length-9);
	}
}

uint8_t radio_networkserver_send(radio_networkserver_address_t dest, uint8_t *payload, uint8_t length) {
	uint8_t send_buffer[length+9];
	send_buffer[0] = 9+length;
	send_buffer[1] = ((uint32_t) radio_networkserver_get_node_id()) & 0xFF;
	send_buffer[2] = (((uint32_t) radio_networkserver_get_node_id()) >> 8) & 0xFF;
	send_buffer[3] = (((uint32_t) radio_networkserver_get_node_id()) >> 16) & 0xFF;
	send_buffer[4] = (((uint32_t) radio_networkserver_get_node_id()) >> 24) & 0xFF;
	send_buffer[5] = dest & 0xFF;
	send_buffer[6] = (dest >> 8) & 0xFF;
	send_buffer[7] = (dest >> 16) & 0xFF;
	send_buffer[8] = (dest >> 24) & 0xFF;
	memcpy(send_buffer+9, payload, length);
    int retval = write(radio_networkserver_sockfd, send_buffer, length+9);
	DEBUG_LOG(DBG_WKCOMM, "message sent to %d, length %d\n", dest, length);
	if (retval != -1)
		return 0;
	else
		return -1;
}

#endif // RADIO_USE_NETWORKSERVER
