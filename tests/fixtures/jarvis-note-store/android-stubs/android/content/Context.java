package android.content;
import java.util.*;
public class Context {
 public static final int MODE_PRIVATE=0;
 private final Map<String,String> data=new HashMap<>();
 public Context getApplicationContext(){return this;}
 public SharedPreferences getSharedPreferences(String name,int mode){
  return new SharedPreferences(){
   public String getString(String k,String d){return data.getOrDefault(k,d);}
   public Editor edit(){return new Editor(){
    final Map<String,String> values=new HashMap<>(); boolean clear=false;
    public Editor putString(String k,String v){values.put(k,v);return this;}
    public Editor clear(){clear=true;return this;}
    public boolean commit(){if(clear)data.clear();data.putAll(values);return true;}
   };}
  };
 }
}
