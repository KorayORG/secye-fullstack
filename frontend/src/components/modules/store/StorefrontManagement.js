
import React, { useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../ui/tabs';
import StoreProducts from './StoreProducts';
import StoreStock from './StoreStock';
import StoreStats from './StoreStats';
import StoreOrders from './StoreOrders';

// companyId prop'u ile gelir
const StorefrontManagement = ({ companyId }) => {
  const [activeTab, setActiveTab] = useState('products');

  return (
    <div className="storefront-management">
      <h2 className="text-2xl font-bold mb-4">Mağazam</h2>
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="products">Ürünler</TabsTrigger>
          <TabsTrigger value="stock">Stok Takip</TabsTrigger>
          <TabsTrigger value="stats">İstatistikler</TabsTrigger>
          <TabsTrigger value="orders">Siparişler</TabsTrigger>
        </TabsList>
        <TabsContent value="products">
          <StoreProducts companyId={companyId} />
        </TabsContent>
        <TabsContent value="stock">
          <StoreStock companyId={companyId} />
        </TabsContent>
        <TabsContent value="stats">
          <StoreStats companyId={companyId} />
        </TabsContent>
        <TabsContent value="orders">
          <StoreOrders companyId={companyId} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default StorefrontManagement;
