package testandroid;
import java.security.Provider;
public class MemoryAndroidProvider extends Provider {
 public MemoryAndroidProvider(){super("AndroidKeyStore","1.0","In-memory test double, not an Android keystore");
  put("KeyStore.AndroidKeyStore",MemoryKeyStore.class.getName());
  put("KeyGenerator.AES",MemoryKeyGenerator.class.getName());
 }
}
