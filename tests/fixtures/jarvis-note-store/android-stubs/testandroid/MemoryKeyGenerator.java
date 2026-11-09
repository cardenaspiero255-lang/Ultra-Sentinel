package testandroid;
import android.security.keystore.KeyGenParameterSpec;
import java.security.*;
import java.security.spec.AlgorithmParameterSpec;
import javax.crypto.*;
public class MemoryKeyGenerator extends KeyGeneratorSpi {
 private String alias;
 protected void engineInit(SecureRandom r){throw new UnsupportedOperationException();}
 protected void engineInit(int size,SecureRandom r){throw new UnsupportedOperationException();}
 protected void engineInit(AlgorithmParameterSpec spec,SecureRandom r){alias=((KeyGenParameterSpec)spec).alias;}
 protected SecretKey engineGenerateKey(){
  try{KeyGenerator g=KeyGenerator.getInstance("AES");g.init(256);SecretKey key=g.generateKey();MemoryKeyStore.keys.put(alias,key);return key;}
  catch(GeneralSecurityException e){throw new RuntimeException(e);}
 }
}
