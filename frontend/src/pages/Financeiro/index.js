import React, { useState, useEffect, useReducer, useContext } from "react";
import { toast } from "react-toastify";

import { makeStyles } from "@material-ui/core/styles";
import Paper from "@material-ui/core/Paper";
import Button from "@material-ui/core/Button";
import Table from "@material-ui/core/Table";
import TableBody from "@material-ui/core/TableBody";
import TableCell from "@material-ui/core/TableCell";
import TableHead from "@material-ui/core/TableHead";
import TableRow from "@material-ui/core/TableRow";
import MainContainer from "../../components/MainContainer";
import MainHeader from "../../components/MainHeader";
import Title from "../../components/Title";
import SubscriptionModal from "../../components/SubscriptionModal";
import api from "../../services/api";
import { i18n } from "../../translate/i18n";
import TableRowSkeleton from "../../components/TableRowSkeleton";
import { AuthContext } from "../../context/Auth/AuthContext";
import toastError from "../../errors/toastError";
import moment from "moment";

const reducer = (state, action) => {
  switch (action.type) {
    case "LOAD_INVOICES":
      return [...state, ...action.payload];
    case "UPDATE_USER":
      return state.map(user => (user.id === action.payload.id ? action.payload : user));
    case "DELETE_USER":
      return state.filter(user => user.id !== action.payload);
    case "RESET":
      return [];
    default:
      return state;
  }
};

const useStyles = makeStyles((theme) => ({
  mainPaper: {
    flex: 1,
    padding: theme.spacing(1),
    overflowY: "scroll",
    ...theme.scrollbarStyles,
  },
}));

const Invoices = () => {
  const classes = useStyles();
  const { user } = useContext(AuthContext);
  const companyId = user.companyId;

  const [loading, setLoading] = useState(false);
  const [pageNumber, setPageNumber] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [searchParam, setSearchParam] = useState("");
  const [invoices, dispatch] = useReducer(reducer, []);
  const [storagePlans, setStoragePlans] = useState([]);
  const [selectedContactId, setSelectedContactId] = useState(null);
  const [contactModalOpen, setContactModalOpen] = useState(false);

  const handleOpenContactModal = (invoice) => {
    setStoragePlans(invoice);
    setSelectedContactId(null);
    setContactModalOpen(true);
  };

  const handleCloseContactModal = () => {
    setSelectedContactId(null);
    setContactModalOpen(false);
  };

  useEffect(() => {
    dispatch({ type: "RESET" });
    setPageNumber(1);
  }, [searchParam]);

  useEffect(() => {
    const fetchInvoices = async () => {
      setLoading(true);
      try {
        const { data } = await api.get(`/invoices/all/${companyId}`, {
          params: { searchParam, pageNumber },
        });
        dispatch({ type: "LOAD_INVOICES", payload: data });
        setHasMore(data.hasMore);
      } catch (err) {
        toastError(err);
      } finally {
        setLoading(false);
      }
    };

    const delayDebounceFn = setTimeout(() => {
      fetchInvoices();
    }, 500);
    
    return () => clearTimeout(delayDebounceFn);
  }, [searchParam, pageNumber, companyId]);

  const loadMore = () => {
    if (hasMore && !loading) {
      setPageNumber((prevState) => prevState + 1);
    }
  };

  const handleScroll = (e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollHeight - (scrollTop + 100) < clientHeight) {
      loadMore();
    }
  };

  const rowStyle = (record) => {
    const hoje = moment().format("DD/MM/yyyy");
    const vencimento = moment(record.dueDate).format("DD/MM/yyyy");
    const dias = moment(vencimento, "DD/MM/yyyy").diff(moment(hoje, "DD/MM/yyyy"), 'days');
    if (dias < 0 && record.status !== "paid") {
      return { backgroundColor: "#ffbcbc9c" };
    }
    return {};
  };

  const rowStatus = (record) => {
    const hoje = moment().format("DD/MM/yyyy");
    const vencimento = moment(record.dueDate).format("DD/MM/yyyy");
    const dias = moment(vencimento, "DD/MM/yyyy").diff(moment(hoje, "DD/MM/yyyy"), 'days');
    if (record.status === "paid") {
      return "Pago";
    }
    return dias < 0 ? "Vencido" : "Em Aberto";
  };

  return (
    <MainContainer>
      <SubscriptionModal
        open={contactModalOpen}
        onClose={handleCloseContactModal}
        aria-labelledby="form-dialog-title"
        Invoice={storagePlans}
        contactId={selectedContactId}
      />
      <MainHeader>
        <Title>Faturas</Title>
      </MainHeader>
      <Paper
        className={classes.mainPaper}
        variant="outlined"
        onScroll={handleScroll}
      >
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell align="center">Id</TableCell>
              <TableCell align="center">Detalhes</TableCell>
              <TableCell align="center">Valor</TableCell>
              <TableCell align="center">Data Venc.</TableCell>
              <TableCell align="center">Status</TableCell>
              <TableCell align="center">Ação</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {invoices.map((invoice) => (
              <TableRow style={rowStyle(invoice)} key={invoice.id}>
                <TableCell align="center">{invoice.id}</TableCell>
                <TableCell align="center">{invoice.detail}</TableCell>
                <TableCell style={{ fontWeight: 'bold' }} align="center">
                  {invoice.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </TableCell>
                <TableCell align="center">{moment(invoice.dueDate).format("DD/MM/YYYY")}</TableCell>
                <TableCell style={{ fontWeight: 'bold' }} align="center">{rowStatus(invoice)}</TableCell>
                <TableCell align="center">
                  {rowStatus(invoice) !== "Pago" ? (
                    <Button
                      size="small"
                      variant="outlined"
                      color="secondary"
                      onClick={() => handleOpenContactModal(invoice)}
                    >
                      PAGAR
                    </Button>
                  ) : (
                    <Button size="small" variant="outlined" disabled>
                      PAGO
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {loading && <TableRowSkeleton columns={4} />}
          </TableBody>
        </Table>
      </Paper>
    </MainContainer>
  );
};

export default Invoices;
