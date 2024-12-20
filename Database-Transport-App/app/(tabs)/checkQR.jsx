import React, { useEffect, useState } from 'react';
import { View, Text, Image, TouchableOpacity, ScrollView } from 'react-native';
import { styles } from '../../Styles/checkQR_Style';
import Feather from '@expo/vector-icons/Feather';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { router, useLocalSearchParams } from 'expo-router';
import supabase from '../../lib/supabase-client';
import { useCameraPermissions } from 'expo-camera';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function checkQR() {
  const { reportID, employeeID, packageIds } = useLocalSearchParams();
  const [products, setProducts] = useState([]);
  const [storageQR, setStorageQR] = useState([]);
  const [allComplete, setAllComplete] = useState(false);
  const [deliveryStatus, setDeliveryStatus] = useState('Start Delivery'); // Button text

  useEffect(() => {
    fetchProducts();
    initializeStorageQR();
    fetchReportStatus(); // Check report status on page load
  }, [packageIds]);

  useEffect(() => {
    checkAllComplete();
  }, [products, storageQR]);

  const fetchProducts = async () => {
    if (!packageIds) {
      console.error('No packageIds provided');
      return;
    }
    const packageIdsArray = packageIds.split(',');
    const { data, error } = await supabase
      .from('package')
      .select('*')
      .in('package_id', packageIdsArray);

    if (error) {
      console.error('Error fetching products:', error);
    } else {
      setProducts(data);
    }
  };

  const initializeStorageQR = async () => {
    try {
      const existingData = await AsyncStorage.getItem('@QRDATA');
      if (existingData) {
        setStorageQR(JSON.parse(existingData));
      } else {
        await AsyncStorage.setItem('@QRDATA', JSON.stringify([]));
        setStorageQR([]);
      }
    } catch (error) {
      console.error('Error initializing storageQR:', error);
    }
  };

  const fetchReportStatus = async () => {
    const { data, error } = await supabase
      .from('report')
      .select('status')
      .eq('report_id', reportID)
      .maybeSingle();

    if (error) {
      console.error('Error fetching report status:', error);
    } else {
      if (data.status === 'In Progress') {
        setDeliveryStatus('Complete');
      } else if (data.status === 'Completed') {
        setDeliveryStatus('Delivery Completed');
      } else {
        setDeliveryStatus('Start Delivery');
      }
    }
  };

  const resetStorageQR = async () => {
    try {
      await AsyncStorage.setItem('@QRDATA', JSON.stringify([]));
      setStorageQR([]);
      console.log('Storage reset successfully');
    } catch (error) {
      console.error('Error resetting storage:', error);
    }
  };

  const checkAllComplete = () => {
    const allCompleted = products.every((pkg) => storageQR.includes(pkg.package_id));
    setAllComplete(allCompleted);
  };

  const handleStartDelivery = async () => {
    if (deliveryStatus === 'Start Delivery') {
      // Update report status to 'In Progress'
      const { error } = await supabase
        .from('report')
        .update({ status: 'In Progress' })
        .eq('report_id', reportID);

      if (error) {
        console.error('Error updating report to In Progress:', error);
      } else {
        setDeliveryStatus('Complete');
      }
    } else if (deliveryStatus === 'Complete') {
      // Update report status to 'Completed'
      const { error } = await supabase
        .from('report')
        .update({ status: 'Completed' })
        .eq('report_id', reportID);

      if (error) {
        console.error('Error updating report to Completed:', error);
      } else {
        setDeliveryStatus('Delivery Completed');
      }
    }
  };

  const [permission, requestPermission] = useCameraPermissions();
  const isPermissionGranted = Boolean(permission?.granted);

  return (
    <View style={styles.container}>
      <View style={styles.headerContainer}>
        <View style={styles.firstHeaderContainer}>
          <View style={styles.userNameBox}>
            <View style={styles.imageBox}>
              <Image source={{ uri: 'https://i.pinimg.com/736x/64/56/c4/6456c41df52ca456a072dc086c091f7a.jpg' }} style={styles.userImage} />
            </View>
            <Text style={styles.userName}>Doan Le Vy</Text>
          </View>
          <View style={styles.notificationButton}>
            <Feather name="bell" size={30} color="#4A628A" />
          </View>
        </View>
      </View>

      <View style={styles.bodyContainer}>
        <ScrollView style={styles.tableContainer}>
          <View style={styles.table}>
            <View style={styles.row_Header}>
              <Text style={[styles.cell_Header, { flex: 1.2 }]}>ID</Text>
              <Text style={[styles.cell_Header, { flex: 4 }]}>Product</Text>
              <Text style={[styles.cell_Header, { flex: 1.2 }]}>ScanQR</Text>
              <Text style={[styles.cell_Header, { flex: 1.2 }]}>Status</Text>
            </View>
            {products.map((pkg) => (
              <View style={styles.row} key={pkg.package_id}>
                <Text style={[styles.cell_Data, { flex: 1.2 }]}>{pkg.package_id}</Text>
                <Text style={[styles.cell_Data, { flex: 4 }]}>{pkg.product_name}</Text>
                <TouchableOpacity
                  style={[styles.cell_Data, { flex: 1.2 }]}
                  disabled={!isPermissionGranted}
                  onPress={() => {
                    router.replace({
                      pathname: '/scanner',
                      params: { employeeID, packageIds, dataQR: pkg.package_id }
                    });
                  }}>
                  <MaterialIcons
                    name="qr-code-scanner"
                    size={24}
                    color="black"
                    style={[{ opacity: !isPermissionGranted ? 0.5 : 1 }]}
                  />
                </TouchableOpacity>
                <Text style={[styles.cell_Data, { flex: 1.2 }]}>
                  {storageQR.includes(pkg.package_id) ? 'Complete' : 'Not started'}
                </Text>
              </View>
            ))}
          </View>
        </ScrollView>
      </View>

      <View style={styles.Footer_container}>
        <TouchableOpacity
          style={styles.confirmed_Button}
          disabled={!allComplete || deliveryStatus === 'Delivery Completed'}
          onPress={handleStartDelivery}>
          <Text style={styles.confirmed_Button_Text}>
            {deliveryStatus}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.confirmed_Button} onPress={requestPermission}>
          <Text style={styles.confirmed_Button_Text}>Grant Permission</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.confirmed_Button} onPress={resetStorageQR}>
          <Text style={styles.confirmed_Button_Text}>Reset Storage</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
