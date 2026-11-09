package testandroid;
import java.io.*;
import java.security.*;
import java.security.cert.Certificate;
import java.util.*;
public class MemoryKeyStore extends KeyStoreSpi {
 static final Map<String,Key> keys=new HashMap<>();
 public Key engineGetKey(String alias,char[] password){return keys.get(alias);}
 public Certificate[] engineGetCertificateChain(String alias){return null;}
 public Certificate engineGetCertificate(String alias){return null;}
 public Date engineGetCreationDate(String alias){return new Date(0);}
 public void engineSetKeyEntry(String alias,Key key,char[] password,Certificate[] chain){keys.put(alias,key);}
 public void engineSetKeyEntry(String alias,byte[] key,Certificate[] chain){throw new UnsupportedOperationException();}
 public void engineSetCertificateEntry(String alias,Certificate cert){throw new UnsupportedOperationException();}
 public void engineDeleteEntry(String alias){keys.remove(alias);}
 public Enumeration<String> engineAliases(){return Collections.enumeration(keys.keySet());}
 public boolean engineContainsAlias(String alias){return keys.containsKey(alias);}
 public int engineSize(){return keys.size();}
 public boolean engineIsKeyEntry(String alias){return keys.containsKey(alias);}
 public boolean engineIsCertificateEntry(String alias){return false;}
 public String engineGetCertificateAlias(Certificate cert){return null;}
 public void engineStore(OutputStream out,char[] password){}
 public void engineLoad(InputStream in,char[] password){}
}
