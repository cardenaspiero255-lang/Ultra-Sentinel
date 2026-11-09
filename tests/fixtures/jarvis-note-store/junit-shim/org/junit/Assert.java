package org.junit;
import java.util.Objects;
public class Assert {
 public static void fail(String m){throw new AssertionError(m);}
 public static void assertTrue(boolean v){if(!v)fail("expected true");}
 public static void assertFalse(boolean v){if(v)fail("expected false");}
 public static void assertNull(Object v){if(v!=null)fail("expected null");}
 public static void assertNotNull(Object v){if(v==null)fail("expected non-null");}
 public static void assertEquals(Object a,Object b){if(!Objects.equals(a,b))fail("objects differ");}
 public static void assertEquals(long a,long b){if(a!=b)fail("integers differ");}
}
