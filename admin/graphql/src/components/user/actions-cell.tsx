import ActionButtons from '@/components/common/action-buttons';
import { useMeQuery } from '@/graphql/me.graphql';

type IProps = {
  id: string;
  is_active: boolean;
};

const UserActionCell = ({ id, is_active }: IProps) => {
  const { data: currentUser } = useMeQuery();
  return (
    currentUser?.me?.id != id && (
      <ActionButtons
        id={id}
        userStatus={true}
        isUserActive={is_active}
        showAddWalletPoints={true}
        showMakeAdminButton={true}
      />
    )
  );
};

export { UserActionCell };
