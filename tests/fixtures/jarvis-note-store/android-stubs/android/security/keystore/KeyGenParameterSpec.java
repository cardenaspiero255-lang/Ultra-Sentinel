package android.security.keystore;
import java.security.spec.AlgorithmParameterSpec;
public class KeyGenParameterSpec implements AlgorithmParameterSpec {
 public final String alias;
 KeyGenParameterSpec(String alias){this.alias=alias;}
 public static class Builder {
  private final String alias;
  public Builder(String alias,int purpose){this.alias=alias;}
  public Builder setBlockModes(String value){return this;}
  public Builder setEncryptionPaddings(String value){return this;}
  public Builder setKeySize(int value){return this;}
  public KeyGenParameterSpec build(){return new KeyGenParameterSpec(alias);}
 }
}
