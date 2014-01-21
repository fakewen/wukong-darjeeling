import java.net.*; 
import java.io.*; 
import java.util.*;

public class WuKongNetworkServer extends Thread
{
	protected static boolean serverContinue = true;
	protected static Map<Integer, WuKongNetworkServer> clients;
	protected Socket clientSocket;
	protected int clientId;
	protected Queue<byte[]> messages;
	protected boolean keepRunning;

	public static void main(String[] args) throws IOException 
	{ 
		clients = new HashMap<Integer, WuKongNetworkServer>();

		ServerSocket serverSocket = null; 

		try { 
			serverSocket = new ServerSocket(10008); 
			System.out.println ("Connection Socket Created");
			try { 
				while (serverContinue) {
					serverSocket.setSoTimeout(10000);
					try {
						new WuKongNetworkServer (serverSocket.accept()); 
					}
					catch (SocketTimeoutException ste) {
//						System.out.println ("Timeout Occurred");
					}
				}
			} 
			catch (IOException e) { 
				System.err.println("Accept failed."); 
				System.exit(1); 
			} 
		} 
		catch (IOException e) { 
			System.err.println("Could not listen on port: 10008."); 
			System.exit(1); 
		} 
		finally {
			try {
				System.out.println ("Closing Server Connection Socket");
				serverSocket.close(); 
			}
			catch (IOException e) {
				System.err.println("Could not close port: 10008."); 
				System.exit(1); 
			} 
		}
	}

	private WuKongNetworkServer (Socket clientSoc)
	{
		messages = new LinkedList<byte[]>();
		keepRunning = true;
		clientSocket = clientSoc;
		start();
	}

	public void run()
	{
		try { 
			BufferedReader in = new BufferedReader(new InputStreamReader(clientSocket.getInputStream()));
			BufferedOutputStream out = new BufferedOutputStream(clientSocket.getOutputStream());
			long lastHeartbeat = 0;

			// Say hi
			out.write(42);
			out.flush();

			// Get client id
			this.clientId = in.read();
			if (this.clientId < 0)
				throw new IOException("No ID received");
			this.clientId += 256*in.read();
			System.out.println("New client " + this.clientId);


			if (WuKongNetworkServer.clients.get(this.clientId) != null)
				WuKongNetworkServer.clients.get(this.clientId).keepRunning = false; // Kill old thread for client with same ID if it was still around
			// Register this client in the global list
			WuKongNetworkServer.clients.put(this.clientId, this);

			while(keepRunning) {
				// Receive messages
				if (in.ready()) {
					byte length = (byte)in.read();
					byte [] message = new byte[length];
					message[0] = (byte)length;
					for (int i=1; i<length; i++)
						message[i] = (byte)in.read();
					int destId = message[3] + message[4]*256;

					System.out.println("Received message for " + destId + ", length " + length);

					WuKongNetworkServer destClient = WuKongNetworkServer.clients.get(destId);
					if (destClient != null) {
						destClient.messages.add(message);
					}
					else
						System.out.println("Message for " + destId + " dropped.");
				}

				// Send messages
				if (this.messages.size() > 0) {
					System.out.println("Forwarding message to node " + this.clientId);
					byte [] message = this.messages.poll();
					for (int i=0; i<message[0]; i++)
						out.write(message[i]);
					out.flush();
				}

				// Heartbeat
				if (System.currentTimeMillis() - lastHeartbeat > 1000) {
					System.out.println("Heartbeat for node " + this.clientId);
					try {
					lastHeartbeat = System.currentTimeMillis();
					out.write(0);
					out.flush();
					}
					catch (IOException e){
						this.keepRunning = false;
					}
				}

				Thread.yield();
			}
		} 
		catch (IOException e) { 
			System.err.println("Problem with Communication Server");
			System.err.println(e);
		} 
		finally {
			System.out.println("Node " + this.clientId + " disconnected.");
			if (WuKongNetworkServer.clients.get(this.clientId) == this)
				WuKongNetworkServer.clients.remove(this.clientId);			
		}
	}
} 